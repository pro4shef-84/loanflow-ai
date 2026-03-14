import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flashModel } from "@/lib/ai/client";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { parseBody, generatePreapprovalSchema } from "@/lib/validation/api-schemas";
import type { Database } from "@/lib/types/database.types";

type LoanRow = Database["public"]["Tables"]["loan_files"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const rawBody = await request.json();
    const parsed = parseBody(generatePreapprovalSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(errorResponse(parsed.error), { status: 400 });
    }
    const { loanFileId } = parsed.data;

    const { data: loanData, error: loanError } = await supabase
      .from("loan_files")
      .select("*, contacts(*)")
      .eq("id", loanFileId)
      .eq("user_id", user.id)
      .single();

    if (loanError || !loanData) {
      return NextResponse.json(errorResponse("Loan not found"), { status: 404 });
    }

    // Type the joined query result explicitly
    const loan = loanData as LoanRow & { contacts: ContactRow | null };

    const { data: userData } = await supabase
      .from("users")
      .select("full_name, nmls_id, phone, email")
      .eq("id", user.id)
      .single();

    const userProfile = userData as Pick<UserRow, "full_name" | "nmls_id" | "phone" | "email"> | null;

    const borrowerName = loan.contacts
      ? `${loan.contacts.first_name} ${loan.contacts.last_name}`
      : "Borrower";
    const loName = userProfile?.full_name ?? "Loan Officer";
    const loNmls = userProfile?.nmls_id ?? "";

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const expiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const propertyLine = loan.property_address
      ? `${loan.property_address}, ${loan.property_city ?? ""}, ${loan.property_state ?? ""}`
      : "Subject Property to Be Determined";

    const prompt = `Generate a professional mortgage pre-approval letter. Return ONLY the letter text, no preamble.

Details:
- Date: ${today}
- Borrower: ${borrowerName}
- Loan Type: ${loan.loan_type?.toUpperCase() ?? "CONVENTIONAL"}
- Loan Amount: $${loan.loan_amount?.toLocaleString() ?? "TBD"}
- Property Address: ${propertyLine}
- Loan Officer: ${loName}${loNmls ? `, NMLS #${loNmls}` : ""}
- Expiration Date: ${expiry}

The letter should:
1. Start with "Dear [Seller / Seller's Agent]:"
2. Confirm pre-approval status clearly
3. State the loan amount and type
4. Mention it is subject to standard underwriting conditions
5. Include an expiration date
6. Close professionally with the loan officer's signature block
7. Be formal, concise (3-4 paragraphs), and professional
8. Include a standard disclaimer about it not being a commitment to lend`;

    const result = await flashModel.generateContent([
      { text: prompt },
    ]);

    const letterText = result.response.text();

    return NextResponse.json(successResponse({
      letter: letterText,
      meta: {
        borrowerName,
        loanAmount: loan.loan_amount,
        loanType: loan.loan_type,
        loName,
        loNmls,
        date: today,
        expiry,
      },
    }));
  } catch (err) {
    console.error("[generate-preapproval]", err);
    return NextResponse.json(errorResponse("Failed to generate pre-approval letter"), { status: 500 });
  }
}

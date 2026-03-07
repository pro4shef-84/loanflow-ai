import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { parseBody, ausSimulationSchema } from "@/lib/validation/api-schemas";
import type { Database } from "@/lib/types/database.types";

type LoanRow = Database["public"]["Tables"]["loan_files"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type ConditionRow = Database["public"]["Tables"]["conditions"]["Row"];

type LoanWithRelations = LoanRow & {
  contacts: Database["public"]["Tables"]["contacts"]["Row"] | null;
  documents: Pick<DocumentRow, "type" | "status" | "extracted_data">[];
  conditions: Pick<ConditionRow, "status">[];
};

interface AUSResult {
  recommendation: "APPROVE/ELIGIBLE" | "REFER WITH CAUTION" | "REFER";
  confidence: number;
  risk_level: "low" | "medium" | "high";
  findings: { category: string; finding: string; severity: "pass" | "warning" | "fail" }[];
  conditions: string[];
  du_message: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const rawBody = await request.json();
    const parsed = parseBody(ausSimulationSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(errorResponse(parsed.error), { status: 400 });
    }

    const { loanFileId, creditScore, monthlyIncome, monthlyDebts, reserveMonths } = parsed.data;

    const { data: loanData, error: loanError } = await supabase
      .from("loan_files")
      .select("*, contacts(*), documents(type, status, extracted_data), conditions(status)")
      .eq("id", loanFileId)
      .eq("user_id", user.id)
      .single();

    if (loanError || !loanData) {
      return NextResponse.json(errorResponse("Loan not found"), { status: 404 });
    }

    const loan = loanData as unknown as LoanWithRelations;

    const ltv = loan.estimated_value && loan.loan_amount
      ? Math.round((loan.loan_amount / loan.estimated_value) * 1000) / 10
      : null;

    const estimatedPIPayment = loan.loan_amount ? (loan.loan_amount * 0.07) / 12 : 0;
    const dti = monthlyIncome > 0
      ? Math.round(((monthlyDebts + estimatedPIPayment) / monthlyIncome) * 1000) / 10
      : null;

    const docsUploaded = loan.documents?.filter((d) => d.status !== "pending").length ?? 0;
    const totalDocs = loan.documents?.length ?? 0;
    const openConditions = loan.conditions?.filter((c) => c.status === "open").length ?? 0;

    const prompt = `You are an automated underwriting system (AUS) similar to Fannie Mae Desktop Underwriter.
Analyze this loan and return a JSON object with the following structure:
{
  "recommendation": "APPROVE/ELIGIBLE" | "REFER WITH CAUTION" | "REFER",
  "confidence": number (0-100),
  "risk_level": "low" | "medium" | "high",
  "findings": [
    { "category": string, "finding": string, "severity": "pass" | "warning" | "fail" }
  ],
  "conditions": [string],
  "du_message": string (2-3 sentence summary like DU would give)
}

Loan Data:
- Loan Type: ${loan.loan_type}
- Loan Amount: $${loan.loan_amount?.toLocaleString() ?? "N/A"}
- Property Value: $${loan.estimated_value?.toLocaleString() ?? "N/A"}
- LTV: ${ltv ?? "N/A"}%
- Loan Purpose: ${loan.loan_purpose ?? "N/A"}
- Credit Score: ${creditScore}
- Monthly Income: $${monthlyIncome}
- Monthly Debts: $${monthlyDebts}
- DTI: ${dti ?? "N/A"}%
- Reserve Months: ${reserveMonths ?? "N/A"}
- Documents Uploaded: ${docsUploaded} of ${totalDocs}
- Open Conditions: ${openConditions}

Return ONLY valid JSON, no markdown.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";

    let result: AUSResult;
    try {
      result = JSON.parse(text.trim()) as AUSResult;
    } catch {
      result = {
        recommendation: "REFER",
        confidence: 0,
        risk_level: "high",
        findings: [],
        conditions: [],
        du_message: "Unable to process. Please review loan data and try again.",
      };
    }

    return NextResponse.json(successResponse({
      ...result,
      inputs: { creditScore, monthlyIncome, monthlyDebts, dti, ltv, reserveMonths },
    }));
  } catch (err) {
    console.error("[aus-simulation]", err);
    return NextResponse.json(errorResponse("AUS simulation failed"), { status: 500 });
  }
}

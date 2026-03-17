import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/types/api.types";
import { mapAriveLoans } from "@/lib/utils/arive-mapper";
import { z } from "zod";
import { parseBody } from "@/lib/validation/api-schemas";
import { getLoanFileLimit } from "@/lib/stripe/plan-limits";

const importSchema = z.object({
  data: z.unknown(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const parsed = parseBody(importSchema, await request.json());
  if (!parsed.success) {
    return NextResponse.json(errorResponse(parsed.error), { status: 400 });
  }

  // Enforce plan limits before importing
  const { data: profile } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "trial";
  const limit = getLoanFileLimit(tier);

  const { count: existingCount } = await supabase
    .from("loan_files")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("status", "eq", "withdrawn");

  // Map ARIVE data to LoanFlow schema
  const { mapped, errors } = mapAriveLoans(parsed.data.data);

  if (mapped.length === 0 && errors.length > 0) {
    return NextResponse.json(errorResponse("No valid loan records found in the import data"), { status: 400 });
  }

  // Check if import would exceed plan limit
  if (limit !== null && existingCount !== null) {
    const available = limit - existingCount;
    if (available <= 0) {
      return NextResponse.json(
        errorResponse(`Your ${tier} plan allows up to ${limit} active loan files. Upgrade to Pro for unlimited files.`),
        { status: 403 }
      );
    }
    if (mapped.length > available) {
      return NextResponse.json(
        errorResponse(`Import would exceed your plan limit. You can import ${available} more loan file(s). Upgrade to Pro for unlimited.`),
        { status: 403 }
      );
    }
  }

  const imported: string[] = [];
  const importErrors: Array<{ originalId?: string; error: string }> = [
    ...errors.map((e) => ({ originalId: e.originalId, error: e.error })),
  ];

  for (const item of mapped) {
    try {
      // 1. Create contact if we have borrower info
      let contactId: string | null = null;
      if (item.contact) {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("user_id", user.id)
          .eq("first_name", item.contact.first_name)
          .eq("last_name", item.contact.last_name)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact } = await supabase
            .from("contacts")
            .insert({ ...item.contact, user_id: user.id })
            .select("id")
            .single();
          contactId = newContact?.id ?? null;
        }
      }

      // 2. Create the loan file
      const { data: loan, error: loanError } = await supabase
        .from("loan_files")
        .insert({
          ...item.loan,
          user_id: user.id,
          borrower_id: contactId,
        })
        .select("id")
        .single();

      if (loanError || !loan) {
        importErrors.push({
          originalId: item.originalId,
          error: loanError?.message ?? "Failed to create loan file",
        });
        continue;
      }

      // 3. Create the loan application (1003 data)
      await supabase
        .from("loan_applications")
        .insert({ ...item.application, loan_file_id: loan.id });

      // 4. Log import event
      await supabase.from("file_completion_events").insert({
        loan_file_id: loan.id,
        event_type: "loan_imported",
        actor: user.id,
        payload: { source: "arive", original_id: item.originalId },
      });

      imported.push(loan.id);
    } catch (err) {
      importErrors.push({
        originalId: item.originalId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(
    successResponse({
      imported: imported.length,
      errors: importErrors.length,
      loan_ids: imported,
      error_details: importErrors,
    }),
    { status: 200 }
  );
}

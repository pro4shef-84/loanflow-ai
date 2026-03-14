import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";
import {
  REQUIRED_DOCS_BY_LOAN_TYPE,
  SELF_EMPLOYED_ADDITIONAL_DOCS,
  type RequiredDocType,
} from "@/lib/domain/enums";

type Params = { params: Promise<{ id: string }> };
type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];
type RequirementInsert = Database["public"]["Tables"]["document_requirements"]["Insert"];

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify ownership and get loan details
  const { data: loanData, error: loanError } = await supabase
    .from("loan_files")
    .select("id, loan_type, employment_type, checklist_generated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (loanError || !loanData) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const loan = loanData as Pick<LoanFileRow, "id" | "loan_type" | "employment_type" | "checklist_generated_at">;

  // Idempotent: skip if checklist already generated
  if (loan.checklist_generated_at) {
    const { data: existing } = await supabase
      .from("document_requirements")
      .select("*")
      .eq("loan_file_id", id);
    return NextResponse.json(successResponse({ requirements: existing ?? [], already_existed: true }));
  }

  // Determine required docs based on loan type
  const baseDocs = REQUIRED_DOCS_BY_LOAN_TYPE[loan.loan_type] ?? [];
  const allDocs: RequiredDocType[] = [...baseDocs];

  // Add self-employed docs if applicable
  if (loan.employment_type === "self_employed" || loan.employment_type === "1099") {
    for (const doc of SELF_EMPLOYED_ADDITIONAL_DOCS) {
      if (!allDocs.includes(doc)) {
        allDocs.push(doc);
      }
    }
  }

  // Insert document requirements
  const inserts: RequirementInsert[] = allDocs.map((docType) => ({
    loan_file_id: id,
    doc_type: docType,
    state: "awaiting_upload",
  }));

  const { data: created, error: insertError } = await supabase
    .from("document_requirements")
    .insert(inserts)
    .select();

  if (insertError) return NextResponse.json(errorResponse(insertError.message), { status: 500 });

  // Update loan with checklist_generated_at and workflow state
  const { error: updateError } = await supabase
    .from("loan_files")
    .update({
      checklist_generated_at: new Date().toISOString(),
      doc_workflow_state: "awaiting_documents",
    })
    .eq("id", id);

  if (updateError) return NextResponse.json(errorResponse(updateError.message), { status: 500 });

  // Log event
  await supabase.from("file_completion_events").insert({
    loan_file_id: id,
    event_type: "checklist_generated",
    actor: "officer",
    payload: { doc_types: allDocs, loan_type: loan.loan_type, employment_type: loan.employment_type },
  });

  return NextResponse.json(successResponse({ requirements: created ?? [], already_existed: false }), { status: 201 });
}

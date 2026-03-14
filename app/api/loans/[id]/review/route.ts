import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBody, submitReviewSchema } from "@/lib/validation/api-schemas";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";

type Params = { params: Promise<{ id: string }> };
type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];

/** Map review decision to the next doc_workflow_state. */
const DECISION_TO_STATE: Record<string, string> = {
  review_ready: "review_ready",
  needs_correction: "corrections_needed",
  archived: "file_complete", // archived loans are considered "done"
};

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Verify ownership and current state
  const { data: loanData, error: loanError } = await supabase
    .from("loan_files")
    .select("id, doc_workflow_state")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (loanError || !loanData) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const loan = loanData as Pick<LoanFileRow, "id" | "doc_workflow_state">;

  // Verify loan is in officer_review_needed state
  if (loan.doc_workflow_state !== "officer_review_needed") {
    return NextResponse.json(
      errorResponse(`Loan is in "${loan.doc_workflow_state}" state, not "officer_review_needed"`),
      { status: 409 }
    );
  }

  // Validate body
  const body = await request.json();
  const parsed = parseBody(submitReviewSchema, body);
  if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });

  const { decision, notes } = parsed.data;

  // Take a snapshot of current document states for audit
  const { data: docSnapshot } = await supabase
    .from("document_requirements")
    .select("id, doc_type, state")
    .eq("loan_file_id", id);

  // Insert review decision record
  const { data: reviewDecision, error: insertError } = await supabase
    .from("review_decisions")
    .insert({
      loan_file_id: id,
      user_id: user.id,
      decision: decision,
      notes: notes ?? null,
      document_snapshot: docSnapshot ?? [],
    })
    .select()
    .single();

  if (insertError) return NextResponse.json(errorResponse(insertError.message), { status: 500 });

  // Update loan's doc_workflow_state
  const newState = DECISION_TO_STATE[decision] ?? "officer_review_needed";
  const { error: updateError } = await supabase
    .from("loan_files")
    .update({ doc_workflow_state: newState })
    .eq("id", id);

  if (updateError) return NextResponse.json(errorResponse(updateError.message), { status: 500 });

  // Log event
  await supabase.from("file_completion_events").insert({
    loan_file_id: id,
    event_type: "officer_review_submitted",
    actor: "officer",
    payload: { decision, notes: notes ?? null, new_state: newState },
  });

  return NextResponse.json(successResponse({
    review_decision: reviewDecision,
    new_doc_workflow_state: newState,
  }), { status: 201 });
}

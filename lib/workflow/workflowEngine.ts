// ============================================================
// WORKFLOW ENGINE — orchestrates all state machines
// Source of truth for state transitions, event logging, escalations
//
// Usage: const engine = new WorkflowEngine(supabaseClient)
// Pass a service-role client (from createServiceClient()) for
// cross-table operations that bypass RLS.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database.types";
import type {
  DocWorkflowState,
  DocumentRequirementState,
  UploadedDocumentState,
  EscalationCategory,
  EscalationSeverity,
  EscalationStatus,
  FileCompletionEventType,
  TransitionActor,
} from "@/lib/domain/enums";
import {
  allRequirementsSatisfied,
  anyRequirementNeedsCorrection,
  anyRequirementNeedsOfficerReview,
} from "@/lib/domain/rules/workflowRules";
import { DocWorkflowStateMachine } from "./docWorkflowStateMachine";
import { RequirementStateMachine } from "./requirementStateMachine";
import { DocumentStateMachine } from "./documentStateMachine";
import { EscalationStateMachine } from "./escalationStateMachine";

export class WorkflowEngine {
  private db: SupabaseClient<Database>;

  constructor(db: SupabaseClient<Database>) {
    this.db = db;
  }

  // ── Log every event to file_completion_events ────────────

  private async logEvent(
    loanFileId: string | null,
    eventType: FileCompletionEventType,
    actor: string,
    payload: Record<string, Json | undefined>
  ): Promise<void> {
    const { error } = await this.db.from("file_completion_events").insert({
      loan_file_id: loanFileId,
      event_type: eventType,
      actor,
      payload: payload as Json,
    });
    if (error) {
      console.error("[WorkflowEngine] Failed to log event:", {
        loanFileId,
        eventType,
        error: error.message,
      });
    }
  }

  // ── Transition doc_workflow_state on loan_files ───────────

  async transitionDocWorkflow(
    loanFileId: string,
    to: DocWorkflowState,
    actor: TransitionActor,
    actorId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: loan, error: fetchError } = await this.db
      .from("loan_files")
      .select("doc_workflow_state")
      .eq("id", loanFileId)
      .single();

    if (fetchError || !loan) {
      return { success: false, error: "Loan file not found" };
    }

    const currentState = (loan.doc_workflow_state ?? "checklist_pending") as DocWorkflowState;
    const machine = new DocWorkflowStateMachine(currentState);
    const result = machine.transition(to, actor);

    if (!result.success) {
      console.warn("[WorkflowEngine] Doc workflow transition rejected:", {
        loanFileId,
        from: currentState,
        to,
        actor,
        error: result.error,
      });
      return { success: false, error: result.error };
    }

    const { error: updateError } = await this.db
      .from("loan_files")
      .update({
        doc_workflow_state: to,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanFileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await this.logEvent(loanFileId, "doc_workflow_transition", actorId ?? actor, {
      from: result.previous_state,
      to: result.new_state,
      actor,
    });

    return { success: true };
  }

  // ── Transition requirement state ──────────────────────────

  async transitionRequirement(
    requirementId: string,
    to: DocumentRequirementState,
    actor: string = "system"
  ): Promise<{ success: boolean; error?: string }> {
    const { data: req, error: fetchError } = await this.db
      .from("document_requirements")
      .select("state, loan_file_id")
      .eq("id", requirementId)
      .single();

    if (fetchError || !req) {
      return { success: false, error: "Requirement not found" };
    }

    const machine = new RequirementStateMachine(req.state as DocumentRequirementState);
    const result = machine.transition(to);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { error } = await this.db
      .from("document_requirements")
      .update({
        state: to,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requirementId);

    if (error) {
      return { success: false, error: error.message };
    }

    await this.logEvent(req.loan_file_id, "requirement_state_changed", actor, {
      requirement_id: requirementId,
      from: result.previous_state,
      to,
    });

    return { success: true };
  }

  // ── Transition document processing state ──────────────────
  // NOTE: This uses the new fields on the documents table (confidence_score, etc.)
  // NOT the existing documents.status field which remains for backwards compat.

  async transitionDocument(
    documentId: string,
    to: UploadedDocumentState,
    actor: string = "system"
  ): Promise<{ success: boolean; error?: string }> {
    // We store the uploaded document state in the documents table's extracted_data
    // or a new field. For now, we track via file_completion_events and
    // use the confidence_score + issues fields as the source of truth.
    // The actual state is derived from the processing pipeline stage.

    const { data: doc, error: fetchError } = await this.db
      .from("documents")
      .select("loan_file_id, classification_raw")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: "Document not found" };
    }

    // Get current state from classification_raw.processing_state, default to "received"
    const classificationRaw = (doc.classification_raw ?? {}) as Record<string, Json | undefined>;
    const currentState = (classificationRaw.processing_state as UploadedDocumentState | undefined) ?? "received";

    const machine = new DocumentStateMachine(currentState);
    const result = machine.transition(to);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Store updated processing state in classification_raw
    const updatedRaw: Record<string, Json | undefined> = {
      ...classificationRaw,
      processing_state: to,
    };

    const updateData: Database["public"]["Tables"]["documents"]["Update"] = {
      classification_raw: updatedRaw as Json,
      updated_at: new Date().toISOString(),
    };

    // Set validated_at when reaching validated states
    if (to === "validated_ok" || to === "validated_issue_found") {
      updateData.validated_at = new Date().toISOString();
    }

    const { error } = await this.db
      .from("documents")
      .update(updateData)
      .eq("id", documentId);

    if (error) {
      return { success: false, error: error.message };
    }

    await this.logEvent(doc.loan_file_id, "document_validated", actor, {
      document_id: documentId,
      from: result.previous_state,
      to,
    });

    return { success: true };
  }

  // ── Create escalation ─────────────────────────────────────

  async createEscalation(
    loanFileId: string,
    category: EscalationCategory,
    severity: EscalationSeverity,
    description: string,
    documentId?: string
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from("escalations")
      .insert({
        loan_file_id: loanFileId,
        category,
        severity,
        status: "open" as EscalationStatus,
        description,
        document_id: documentId ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[WorkflowEngine] Failed to create escalation:", {
        loanFileId,
        error: error?.message,
      });
      return null;
    }

    await this.logEvent(loanFileId, "escalation_created", "system", {
      escalation_id: data.id,
      category,
      severity,
      description,
      document_id: documentId ?? null,
    });

    return data.id;
  }

  // ── Resolve escalation ────────────────────────────────────

  async resolveEscalation(
    escalationId: string,
    notes: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: esc, error: fetchError } = await this.db
      .from("escalations")
      .select("loan_file_id, status")
      .eq("id", escalationId)
      .single();

    if (fetchError || !esc) {
      return { success: false, error: "Escalation not found" };
    }

    const machine = new EscalationStateMachine(esc.status as EscalationStatus);
    const result = machine.transition("resolved", notes);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const { error } = await this.db
      .from("escalations")
      .update({
        status: "resolved" as EscalationStatus,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", escalationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await this.logEvent(esc.loan_file_id, "escalation_resolved", userId, {
      escalation_id: escalationId,
      resolution_notes: notes,
    });

    return { success: true };
  }

  // ── Evaluate loan doc status ──────────────────────────────
  // Checks all requirements, transitions doc_workflow_state accordingly

  async evaluateLoanDocStatus(loanFileId: string): Promise<void> {
    const { data: requirements } = await this.db
      .from("document_requirements")
      .select("state")
      .eq("loan_file_id", loanFileId);

    if (!requirements || requirements.length === 0) return;

    const { data: loan } = await this.db
      .from("loan_files")
      .select("doc_workflow_state")
      .eq("id", loanFileId)
      .single();

    if (!loan) return;

    const currentState = (loan.doc_workflow_state ?? "checklist_pending") as DocWorkflowState;
    const states = requirements.map((r) => r.state as DocumentRequirementState);

    // Only re-evaluate if in the review state
    if (currentState !== "documents_in_review") return;

    if (anyRequirementNeedsOfficerReview(states)) {
      await this.transitionDocWorkflow(loanFileId, "officer_review_needed", "system");
    } else if (anyRequirementNeedsCorrection(states)) {
      await this.transitionDocWorkflow(loanFileId, "corrections_needed", "system");
    } else if (allRequirementsSatisfied(states)) {
      await this.transitionDocWorkflow(loanFileId, "officer_review_needed", "system");
    }
  }
}

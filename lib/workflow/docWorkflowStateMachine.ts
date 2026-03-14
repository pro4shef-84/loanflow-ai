// ============================================================
// DOC WORKFLOW STATE MACHINE
// Manages the doc_workflow_state field on loan_files
// This is PARALLEL to loan_files.status (loan lifecycle).
// ============================================================

import type { DocWorkflowState, TransitionActor } from "@/lib/domain/enums";
import type { TransitionResult } from "@/lib/domain/entities";
import { canTransitionDocWorkflow, getValidDocWorkflowTransitions } from "@/lib/domain/rules/workflowRules";

export class DocWorkflowStateMachine {
  private state: DocWorkflowState;

  constructor(initialState: DocWorkflowState = "checklist_pending") {
    this.state = initialState;
  }

  get currentState(): DocWorkflowState {
    return this.state;
  }

  transition(
    to: DocWorkflowState,
    actor: TransitionActor
  ): TransitionResult<DocWorkflowState> {
    const previous = this.state;

    if (!canTransitionDocWorkflow(this.state, to, actor)) {
      return {
        success: false,
        previous_state: previous,
        new_state: this.state,
        error: `Doc workflow transition from '${this.state}' to '${to}' by '${actor}' is not allowed.`,
      };
    }

    this.state = to;
    return {
      success: true,
      previous_state: previous,
      new_state: this.state,
    };
  }

  canTransitionTo(to: DocWorkflowState, actor: TransitionActor): boolean {
    return canTransitionDocWorkflow(this.state, to, actor);
  }

  getAvailableTransitions(actor: TransitionActor): DocWorkflowState[] {
    return getValidDocWorkflowTransitions(this.state, actor);
  }

  isTerminal(): boolean {
    return this.state === "file_complete";
  }

  requiresBorrowerAction(): boolean {
    return this.state === "awaiting_documents" || this.state === "corrections_needed";
  }

  requiresOfficerAction(): boolean {
    return this.state === "officer_review_needed" || this.state === "borrower_unresponsive";
  }

  requiresSystemAction(): boolean {
    return this.state === "documents_in_review" || this.state === "checklist_pending";
  }
}

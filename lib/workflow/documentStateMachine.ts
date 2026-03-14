// ============================================================
// UPLOADED DOCUMENT STATE MACHINE
// Manages the document processing lifecycle (10 states)
// ============================================================

import type { UploadedDocumentState } from "@/lib/domain/enums";
import type { TransitionResult } from "@/lib/domain/entities";
import { canTransitionDocument } from "@/lib/domain/rules/workflowRules";

export class DocumentStateMachine {
  private state: UploadedDocumentState;

  constructor(initialState: UploadedDocumentState = "received") {
    this.state = initialState;
  }

  get currentState(): UploadedDocumentState {
    return this.state;
  }

  transition(to: UploadedDocumentState): TransitionResult<UploadedDocumentState> {
    const previous = this.state;

    if (!canTransitionDocument(this.state, to)) {
      return {
        success: false,
        previous_state: previous,
        new_state: this.state,
        error: `Document transition from '${this.state}' to '${to}' is not allowed.`,
      };
    }

    this.state = to;
    return {
      success: true,
      previous_state: previous,
      new_state: this.state,
    };
  }

  isTerminal(): boolean {
    return (
      this.state === "rejected" ||
      this.state === "superseded" ||
      this.state === "precheck_failed"
    );
  }

  isAccepted(): boolean {
    return this.state === "accepted_tentatively";
  }

  requiresOfficerReview(): boolean {
    return this.state === "needs_officer_review";
  }
}

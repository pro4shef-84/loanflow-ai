// ============================================================
// DOCUMENT REQUIREMENT STATE MACHINE
// Manages document_requirements.state
// ============================================================

import type { DocumentRequirementState } from "@/lib/domain/enums";
import type { TransitionResult } from "@/lib/domain/entities";
import { canTransitionRequirement } from "@/lib/domain/rules/workflowRules";

export class RequirementStateMachine {
  private state: DocumentRequirementState;

  constructor(initialState: DocumentRequirementState = "required") {
    this.state = initialState;
  }

  get currentState(): DocumentRequirementState {
    return this.state;
  }

  transition(to: DocumentRequirementState): TransitionResult<DocumentRequirementState> {
    const previous = this.state;

    if (!canTransitionRequirement(this.state, to)) {
      return {
        success: false,
        previous_state: previous,
        new_state: this.state,
        error: `Requirement transition from '${this.state}' to '${to}' is not allowed.`,
      };
    }

    this.state = to;
    return {
      success: true,
      previous_state: previous,
      new_state: this.state,
    };
  }

  isSatisfied(): boolean {
    return (
      this.state === "tentatively_satisfied" ||
      this.state === "confirmed_by_officer" ||
      this.state === "waived_by_officer"
    );
  }

  needsAction(): boolean {
    return (
      this.state === "required" ||
      this.state === "awaiting_upload" ||
      this.state === "correction_required"
    );
  }

  isInReview(): boolean {
    return (
      this.state === "uploaded_pending_validation" ||
      this.state === "needs_officer_review"
    );
  }
}

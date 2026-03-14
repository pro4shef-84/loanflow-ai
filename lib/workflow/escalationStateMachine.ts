// ============================================================
// ESCALATION STATE MACHINE
// Manages escalation.status (4 states)
// Resolution requires notes.
// ============================================================

import type { EscalationStatus } from "@/lib/domain/enums";
import type { TransitionResult } from "@/lib/domain/entities";
import { canTransitionEscalation } from "@/lib/domain/rules/workflowRules";

export class EscalationStateMachine {
  private state: EscalationStatus;

  constructor(initialState: EscalationStatus = "open") {
    this.state = initialState;
  }

  get currentState(): EscalationStatus {
    return this.state;
  }

  /**
   * Transition the escalation state.
   * If transitioning to "resolved", resolution notes are required.
   */
  transition(
    to: EscalationStatus,
    resolutionNotes?: string
  ): TransitionResult<EscalationStatus> {
    const previous = this.state;

    if (to === "resolved" && (!resolutionNotes || resolutionNotes.trim().length === 0)) {
      return {
        success: false,
        previous_state: previous,
        new_state: this.state,
        error: "Resolution notes are required when resolving an escalation.",
      };
    }

    if (!canTransitionEscalation(this.state, to)) {
      return {
        success: false,
        previous_state: previous,
        new_state: this.state,
        error: `Escalation transition from '${this.state}' to '${to}' is not allowed.`,
      };
    }

    this.state = to;
    return {
      success: true,
      previous_state: previous,
      new_state: this.state,
    };
  }

  isResolved(): boolean {
    return this.state === "resolved" || this.state === "dismissed";
  }

  isActive(): boolean {
    return this.state === "open" || this.state === "acknowledged";
  }
}

import { describe, it, expect } from "vitest";
import { DocWorkflowStateMachine } from "@/lib/workflow/docWorkflowStateMachine";
import { RequirementStateMachine } from "@/lib/workflow/requirementStateMachine";
import { DocumentStateMachine } from "@/lib/workflow/documentStateMachine";
import { EscalationStateMachine } from "@/lib/workflow/escalationStateMachine";

// ── DocWorkflowStateMachine ─────────────────────────────────

describe("DocWorkflowStateMachine", () => {
  it("defaults to checklist_pending", () => {
    const sm = new DocWorkflowStateMachine();
    expect(sm.currentState).toBe("checklist_pending");
  });

  it("accepts initial state", () => {
    const sm = new DocWorkflowStateMachine("awaiting_documents");
    expect(sm.currentState).toBe("awaiting_documents");
  });

  it("valid transition returns success with correct previous/new states", () => {
    const sm = new DocWorkflowStateMachine("checklist_pending");
    const result = sm.transition("awaiting_documents", "system");
    expect(result.success).toBe(true);
    expect(result.previous_state).toBe("checklist_pending");
    expect(result.new_state).toBe("awaiting_documents");
    expect(sm.currentState).toBe("awaiting_documents");
  });

  it("invalid transition returns failure with error message", () => {
    const sm = new DocWorkflowStateMachine("checklist_pending");
    const result = sm.transition("file_complete", "officer");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("checklist_pending");
    expect(result.error).toContain("file_complete");
    expect(sm.currentState).toBe("checklist_pending"); // state unchanged
  });

  it("invalid actor returns failure", () => {
    const sm = new DocWorkflowStateMachine("checklist_pending");
    const result = sm.transition("awaiting_documents", "officer");
    expect(result.success).toBe(false);
  });

  it("full happy path: checklist_pending -> file_complete", () => {
    const sm = new DocWorkflowStateMachine();
    expect(sm.transition("awaiting_documents", "system").success).toBe(true);
    expect(sm.transition("documents_in_review", "system").success).toBe(true);
    expect(sm.transition("officer_review_needed", "system").success).toBe(true);
    expect(sm.transition("review_ready", "officer").success).toBe(true);
    expect(sm.transition("file_complete", "officer").success).toBe(true);
    expect(sm.currentState).toBe("file_complete");
    expect(sm.isTerminal()).toBe(true);
  });

  it("isTerminal returns false for non-terminal states", () => {
    const sm = new DocWorkflowStateMachine("review_ready");
    expect(sm.isTerminal()).toBe(false);
  });

  it("requiresBorrowerAction for awaiting_documents and corrections_needed", () => {
    expect(new DocWorkflowStateMachine("awaiting_documents").requiresBorrowerAction()).toBe(true);
    expect(new DocWorkflowStateMachine("corrections_needed").requiresBorrowerAction()).toBe(true);
    expect(new DocWorkflowStateMachine("review_ready").requiresBorrowerAction()).toBe(false);
  });

  it("requiresOfficerAction for officer_review_needed and borrower_unresponsive", () => {
    expect(new DocWorkflowStateMachine("officer_review_needed").requiresOfficerAction()).toBe(true);
    expect(new DocWorkflowStateMachine("borrower_unresponsive").requiresOfficerAction()).toBe(true);
    expect(new DocWorkflowStateMachine("documents_in_review").requiresOfficerAction()).toBe(false);
  });

  it("requiresSystemAction for documents_in_review and checklist_pending", () => {
    expect(new DocWorkflowStateMachine("documents_in_review").requiresSystemAction()).toBe(true);
    expect(new DocWorkflowStateMachine("checklist_pending").requiresSystemAction()).toBe(true);
    expect(new DocWorkflowStateMachine("officer_review_needed").requiresSystemAction()).toBe(false);
  });

  it("getAvailableTransitions returns correct states", () => {
    const sm = new DocWorkflowStateMachine("officer_review_needed");
    const available = sm.getAvailableTransitions("officer");
    expect(available).toContain("review_ready");
    expect(available).toContain("documents_in_review");
    expect(available).toContain("corrections_needed");
  });

  it("canTransitionTo works correctly", () => {
    const sm = new DocWorkflowStateMachine("review_ready");
    expect(sm.canTransitionTo("file_complete", "officer")).toBe(true);
    expect(sm.canTransitionTo("file_complete", "system")).toBe(false);
  });
});

// ── RequirementStateMachine ─────────────────────────────────

describe("RequirementStateMachine", () => {
  it("defaults to required", () => {
    const sm = new RequirementStateMachine();
    expect(sm.currentState).toBe("required");
  });

  it("valid transition returns success with correct states", () => {
    const sm = new RequirementStateMachine("required");
    const result = sm.transition("awaiting_upload");
    expect(result.success).toBe(true);
    expect(result.previous_state).toBe("required");
    expect(result.new_state).toBe("awaiting_upload");
  });

  it("invalid transition returns failure with error", () => {
    const sm = new RequirementStateMachine("tentatively_satisfied");
    const result = sm.transition("required");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(sm.currentState).toBe("tentatively_satisfied"); // unchanged
  });

  it("happy path: required -> confirmed_by_officer", () => {
    const sm = new RequirementStateMachine();
    expect(sm.transition("awaiting_upload").success).toBe(true);
    expect(sm.transition("uploaded_pending_validation").success).toBe(true);
    expect(sm.transition("tentatively_satisfied").success).toBe(true);
    expect(sm.transition("confirmed_by_officer").success).toBe(true);
    expect(sm.currentState).toBe("confirmed_by_officer");
  });

  it("waiver path: required -> waived_by_officer", () => {
    const sm = new RequirementStateMachine();
    const result = sm.transition("waived_by_officer");
    expect(result.success).toBe(true);
    expect(sm.currentState).toBe("waived_by_officer");
  });

  it("isSatisfied returns true for satisfied states", () => {
    expect(new RequirementStateMachine("tentatively_satisfied").isSatisfied()).toBe(true);
    expect(new RequirementStateMachine("confirmed_by_officer").isSatisfied()).toBe(true);
    expect(new RequirementStateMachine("waived_by_officer").isSatisfied()).toBe(true);
    expect(new RequirementStateMachine("required").isSatisfied()).toBe(false);
  });

  it("needsAction returns true for actionable states", () => {
    expect(new RequirementStateMachine("required").needsAction()).toBe(true);
    expect(new RequirementStateMachine("awaiting_upload").needsAction()).toBe(true);
    expect(new RequirementStateMachine("correction_required").needsAction()).toBe(true);
    expect(new RequirementStateMachine("tentatively_satisfied").needsAction()).toBe(false);
  });

  it("isInReview returns true for review states", () => {
    expect(new RequirementStateMachine("uploaded_pending_validation").isInReview()).toBe(true);
    expect(new RequirementStateMachine("needs_officer_review").isInReview()).toBe(true);
    expect(new RequirementStateMachine("required").isInReview()).toBe(false);
  });
});

// ── DocumentStateMachine ────────────────────────────────────

describe("DocumentStateMachine", () => {
  it("defaults to received", () => {
    const sm = new DocumentStateMachine();
    expect(sm.currentState).toBe("received");
  });

  it("valid transition returns success", () => {
    const sm = new DocumentStateMachine("received");
    const result = sm.transition("processing");
    expect(result.success).toBe(true);
    expect(result.previous_state).toBe("received");
    expect(result.new_state).toBe("processing");
  });

  it("invalid transition returns failure with error message", () => {
    const sm = new DocumentStateMachine("rejected");
    const result = sm.transition("processing");
    expect(result.success).toBe(false);
    expect(result.error).toContain("rejected");
    expect(result.error).toContain("processing");
    expect(sm.currentState).toBe("rejected"); // unchanged
  });

  it("happy path: received -> accepted_tentatively", () => {
    const sm = new DocumentStateMachine();
    expect(sm.transition("processing").success).toBe(true);
    expect(sm.transition("classified").success).toBe(true);
    expect(sm.transition("validated_ok").success).toBe(true);
    expect(sm.transition("accepted_tentatively").success).toBe(true);
    expect(sm.currentState).toBe("accepted_tentatively");
    expect(sm.isAccepted()).toBe(true);
  });

  it("rejection path: received -> rejected", () => {
    const sm = new DocumentStateMachine();
    expect(sm.transition("processing").success).toBe(true);
    expect(sm.transition("classified").success).toBe(true);
    expect(sm.transition("validated_issue_found").success).toBe(true);
    expect(sm.transition("rejected").success).toBe(true);
    expect(sm.isTerminal()).toBe(true);
  });

  it("precheck_failed is terminal", () => {
    const sm = new DocumentStateMachine("precheck_failed");
    expect(sm.isTerminal()).toBe(true);
  });

  it("superseded is terminal", () => {
    const sm = new DocumentStateMachine("superseded");
    expect(sm.isTerminal()).toBe(true);
  });

  it("requiresOfficerReview for needs_officer_review", () => {
    expect(new DocumentStateMachine("needs_officer_review").requiresOfficerReview()).toBe(true);
    expect(new DocumentStateMachine("processing").requiresOfficerReview()).toBe(false);
  });

  it("accepted_tentatively can be superseded", () => {
    const sm = new DocumentStateMachine("accepted_tentatively");
    const result = sm.transition("superseded");
    expect(result.success).toBe(true);
  });
});

// ── EscalationStateMachine ──────────────────────────────────

describe("EscalationStateMachine", () => {
  it("defaults to open", () => {
    const sm = new EscalationStateMachine();
    expect(sm.currentState).toBe("open");
  });

  it("valid transition returns success", () => {
    const sm = new EscalationStateMachine("open");
    const result = sm.transition("acknowledged");
    expect(result.success).toBe(true);
    expect(result.previous_state).toBe("open");
    expect(result.new_state).toBe("acknowledged");
  });

  it("invalid transition returns failure", () => {
    const sm = new EscalationStateMachine("resolved");
    const result = sm.transition("open", "notes");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(sm.currentState).toBe("resolved"); // unchanged
  });

  it("resolution requires notes", () => {
    const sm = new EscalationStateMachine("open");
    const noNotes = sm.transition("resolved");
    expect(noNotes.success).toBe(false);
    expect(noNotes.error).toContain("notes");
  });

  it("resolution with empty string notes fails", () => {
    const sm = new EscalationStateMachine("open");
    const emptyNotes = sm.transition("resolved", "   ");
    expect(emptyNotes.success).toBe(false);
  });

  it("resolution with valid notes succeeds", () => {
    const sm = new EscalationStateMachine("open");
    const result = sm.transition("resolved", "Issue was a false positive");
    expect(result.success).toBe(true);
    expect(sm.currentState).toBe("resolved");
  });

  it("dismissal does not require notes", () => {
    const sm = new EscalationStateMachine("open");
    const result = sm.transition("dismissed");
    expect(result.success).toBe(true);
    expect(sm.currentState).toBe("dismissed");
  });

  it("isResolved returns true for resolved and dismissed", () => {
    expect(new EscalationStateMachine("resolved").isResolved()).toBe(true);
    expect(new EscalationStateMachine("dismissed").isResolved()).toBe(true);
    expect(new EscalationStateMachine("open").isResolved()).toBe(false);
  });

  it("isActive returns true for open and acknowledged", () => {
    expect(new EscalationStateMachine("open").isActive()).toBe(true);
    expect(new EscalationStateMachine("acknowledged").isActive()).toBe(true);
    expect(new EscalationStateMachine("resolved").isActive()).toBe(false);
  });

  it("acknowledged -> resolved with notes succeeds", () => {
    const sm = new EscalationStateMachine("acknowledged");
    const result = sm.transition("resolved", "Reviewed and fixed");
    expect(result.success).toBe(true);
    expect(sm.currentState).toBe("resolved");
  });

  it("acknowledged -> dismissed succeeds", () => {
    const sm = new EscalationStateMachine("acknowledged");
    const result = sm.transition("dismissed");
    expect(result.success).toBe(true);
  });
});

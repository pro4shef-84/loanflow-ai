// ============================================================
// DETERMINISTIC WORKFLOW TRANSITION RULES
// Defines which transitions are valid and under what conditions
// Adapted from mortgage-ai for loanflow-ai
// ============================================================

import type {
  DocWorkflowState,
  DocumentRequirementState,
  UploadedDocumentState,
  EscalationStatus,
  TransitionActor,
} from "../enums";

// ── Doc Workflow State Transitions (loan_files.doc_workflow_state) ──

export interface DocWorkflowTransitionRule {
  from: DocWorkflowState;
  to: DocWorkflowState;
  allowedActors: TransitionActor[];
  description: string;
}

export const DOC_WORKFLOW_TRANSITIONS: DocWorkflowTransitionRule[] = [
  // Checklist generated — start awaiting documents
  {
    from: "checklist_pending",
    to: "awaiting_documents",
    allowedActors: ["system"],
    description: "Checklist generated, borrower invited to upload",
  },
  // First document uploaded — start review
  {
    from: "awaiting_documents",
    to: "documents_in_review",
    allowedActors: ["system"],
    description: "At least one document received, AI validation started",
  },
  // Validation found issues — borrower must correct
  {
    from: "documents_in_review",
    to: "corrections_needed",
    allowedActors: ["system"],
    description: "One or more documents failed validation",
  },
  // Borrower re-uploads corrections
  {
    from: "corrections_needed",
    to: "documents_in_review",
    allowedActors: ["system", "borrower"],
    description: "Borrower uploaded replacement documents",
  },
  // All docs tentatively satisfied — officer should review
  {
    from: "documents_in_review",
    to: "officer_review_needed",
    allowedActors: ["system"],
    description: "All requirements tentatively satisfied, needs officer review",
  },
  // Suspicious/low-confidence docs need officer
  {
    from: "documents_in_review",
    to: "officer_review_needed",
    allowedActors: ["system"],
    description: "Suspicious or low-confidence documents flagged",
  },
  // Officer resolves issues — back to review
  {
    from: "officer_review_needed",
    to: "documents_in_review",
    allowedActors: ["officer"],
    description: "Officer resolved issues, reprocessing",
  },
  // Officer sends back to borrower
  {
    from: "officer_review_needed",
    to: "corrections_needed",
    allowedActors: ["officer"],
    description: "Officer found issues, borrower must correct",
  },
  // Officer approves — review ready
  {
    from: "officer_review_needed",
    to: "review_ready",
    allowedActors: ["officer"],
    description: "Officer approved all documents",
  },
  // Borrower unresponsive after multiple reminders
  {
    from: "awaiting_documents",
    to: "borrower_unresponsive",
    allowedActors: ["system"],
    description: "Borrower did not respond after multiple reminders",
  },
  {
    from: "corrections_needed",
    to: "borrower_unresponsive",
    allowedActors: ["system"],
    description: "Borrower did not correct documents after reminders",
  },
  // Officer re-engages borrower
  {
    from: "borrower_unresponsive",
    to: "awaiting_documents",
    allowedActors: ["officer"],
    description: "Officer re-engaged borrower successfully",
  },
  // Review ready → file complete
  {
    from: "review_ready",
    to: "file_complete",
    allowedActors: ["officer"],
    description: "Officer marked file as complete",
  },
];

export function canTransitionDocWorkflow(
  from: DocWorkflowState,
  to: DocWorkflowState,
  actor: TransitionActor
): boolean {
  return DOC_WORKFLOW_TRANSITIONS.some(
    (rule) => rule.from === from && rule.to === to && rule.allowedActors.includes(actor)
  );
}

export function getValidDocWorkflowTransitions(
  from: DocWorkflowState,
  actor: TransitionActor
): DocWorkflowState[] {
  return DOC_WORKFLOW_TRANSITIONS
    .filter((rule) => rule.from === from && rule.allowedActors.includes(actor))
    .map((rule) => rule.to);
}

// ── Document Requirement State Transitions ──────────────────

type ReqTransition = [DocumentRequirementState, DocumentRequirementState];

const ALLOWED_REQUIREMENT_TRANSITIONS: ReqTransition[] = [
  ["required", "awaiting_upload"],
  ["awaiting_upload", "uploaded_pending_validation"],
  ["uploaded_pending_validation", "tentatively_satisfied"],
  ["uploaded_pending_validation", "correction_required"],
  ["uploaded_pending_validation", "needs_officer_review"],
  ["correction_required", "uploaded_pending_validation"],
  ["needs_officer_review", "tentatively_satisfied"],
  ["needs_officer_review", "correction_required"],
  ["needs_officer_review", "waived_by_officer"],
  ["tentatively_satisfied", "confirmed_by_officer"],
  ["tentatively_satisfied", "correction_required"],
  ["awaiting_upload", "waived_by_officer"],
  ["required", "waived_by_officer"],
];

export function canTransitionRequirement(
  from: DocumentRequirementState,
  to: DocumentRequirementState
): boolean {
  return ALLOWED_REQUIREMENT_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

// ── Uploaded Document State Transitions ─────────────────────

type DocTransition = [UploadedDocumentState, UploadedDocumentState];

const ALLOWED_DOCUMENT_TRANSITIONS: DocTransition[] = [
  ["received", "precheck_failed"],
  ["received", "processing"],
  ["processing", "classified"],
  ["processing", "needs_officer_review"],
  ["classified", "validated_ok"],
  ["classified", "validated_issue_found"],
  ["classified", "needs_officer_review"],
  ["validated_ok", "accepted_tentatively"],
  ["validated_ok", "superseded"],
  ["validated_issue_found", "rejected"],
  ["validated_issue_found", "needs_officer_review"],
  ["validated_issue_found", "superseded"],
  ["accepted_tentatively", "superseded"],
  ["needs_officer_review", "accepted_tentatively"],
  ["needs_officer_review", "rejected"],
  ["needs_officer_review", "superseded"],
  ["rejected", "superseded"],
];

export function canTransitionDocument(
  from: UploadedDocumentState,
  to: UploadedDocumentState
): boolean {
  return ALLOWED_DOCUMENT_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

// ── Escalation State Transitions ────────────────────────────

type EscTransition = [EscalationStatus, EscalationStatus];

const ALLOWED_ESCALATION_TRANSITIONS: EscTransition[] = [
  ["open", "acknowledged"],
  ["open", "resolved"],
  ["open", "dismissed"],
  ["acknowledged", "resolved"],
  ["acknowledged", "dismissed"],
];

export function canTransitionEscalation(
  from: EscalationStatus,
  to: EscalationStatus
): boolean {
  return ALLOWED_ESCALATION_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

// ── Loan-level Aggregation Rules ────────────────────────────

const SATISFIED_STATES: DocumentRequirementState[] = [
  "tentatively_satisfied",
  "confirmed_by_officer",
  "waived_by_officer",
];

export function allRequirementsSatisfied(states: DocumentRequirementState[]): boolean {
  return states.length > 0 && states.every((s) => SATISFIED_STATES.includes(s));
}

export function anyRequirementNeedsCorrection(states: DocumentRequirementState[]): boolean {
  return states.some((s) => s === "correction_required");
}

export function anyRequirementNeedsOfficerReview(states: DocumentRequirementState[]): boolean {
  return states.some((s) => s === "needs_officer_review");
}

export function hasOpenEscalation(statuses: EscalationStatus[]): boolean {
  return statuses.some((s) => s === "open" || s === "acknowledged");
}

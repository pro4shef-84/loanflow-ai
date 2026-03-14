// ============================================================
// FILE COMPLETION ENGINE — Domain Enums
// These are ADDITIONAL to the existing enums in lib/types/loan.types.ts
// ============================================================

/**
 * Document collection workflow state (parallel to loan_files.status).
 * status = loan lifecycle, doc_workflow_state = document collection lifecycle.
 */
export type DocWorkflowState =
  | "checklist_pending"
  | "awaiting_documents"
  | "documents_in_review"
  | "corrections_needed"
  | "borrower_unresponsive"
  | "officer_review_needed"
  | "review_ready"
  | "file_complete";

/** State of an individual document requirement checklist item. */
export type DocumentRequirementState =
  | "required"
  | "awaiting_upload"
  | "uploaded_pending_validation"
  | "tentatively_satisfied"
  | "correction_required"
  | "needs_officer_review"
  | "confirmed_by_officer"
  | "waived_by_officer";

/** State of an uploaded document through the AI processing pipeline. */
export type UploadedDocumentState =
  | "received"
  | "precheck_failed"
  | "processing"
  | "classified"
  | "validated_ok"
  | "validated_issue_found"
  | "needs_officer_review"
  | "superseded"
  | "rejected"
  | "accepted_tentatively";

/** Escalation status. */
export type EscalationStatus = "open" | "acknowledged" | "resolved" | "dismissed";

/** Escalation severity level. */
export type EscalationSeverity = "info" | "warning" | "high" | "critical";

/** Escalation category — why was this escalated? */
export type EscalationCategory =
  | "low_confidence_classification"
  | "borrower_advisory_question"
  | "repeated_failed_upload"
  | "borrower_unresponsive"
  | "name_mismatch"
  | "contradictory_data"
  | "suspicious_document"
  | "unsupported_scenario"
  | "system_processing_failure"
  | "borrower_frustration_signal";

/** Document types required by the file completion engine. */
export type RequiredDocType =
  | "pay_stub"
  | "w2"
  | "bank_statement"
  | "government_id"
  | "purchase_contract"
  | "mortgage_statement"
  | "homeowners_insurance"
  | "tax_return_1040"
  | "schedule_c"
  | "profit_loss_statement"
  | "dd214"
  | "va_coe"
  | "fha_case_number"
  | "unknown_document";

/** Employment type — affects which documents are required. */
export type EmploymentType = "w2" | "self_employed" | "1099" | "retired" | "military";

/** Review decision type. */
export type ReviewDecisionType = "review_ready" | "needs_correction" | "archived";

/** Notification channel for reminders. */
export type ReminderChannel = "email" | "sms";

/** All event types for the file completion audit trail. */
export type FileCompletionEventType =
  | "checklist_generated"
  | "borrower_invited"
  | "document_uploaded"
  | "document_classified"
  | "document_validated"
  | "document_rejected"
  | "document_superseded"
  | "requirement_state_changed"
  | "doc_workflow_transition"
  | "escalation_created"
  | "escalation_acknowledged"
  | "escalation_resolved"
  | "escalation_dismissed"
  | "reminder_sent"
  | "officer_review_submitted"
  | "officer_waived_requirement"
  | "officer_confirmed_requirement"
  | "file_marked_complete";

/** Actor types for workflow transitions. */
export type TransitionActor = "system" | "officer" | "borrower";

// ── Labels for UI display ──────────────────────────────────

export const DOC_WORKFLOW_STATE_LABELS: Record<DocWorkflowState, string> = {
  checklist_pending: "Checklist Pending",
  awaiting_documents: "Awaiting Documents",
  documents_in_review: "Documents In Review",
  corrections_needed: "Corrections Needed",
  borrower_unresponsive: "Borrower Unresponsive",
  officer_review_needed: "Officer Review Needed",
  review_ready: "Review Ready",
  file_complete: "File Complete",
};

export const REQUIREMENT_STATE_LABELS: Record<DocumentRequirementState, string> = {
  required: "Required",
  awaiting_upload: "Awaiting Upload",
  uploaded_pending_validation: "Validating",
  tentatively_satisfied: "Tentatively Satisfied",
  correction_required: "Correction Required",
  needs_officer_review: "Needs Review",
  confirmed_by_officer: "Confirmed",
  waived_by_officer: "Waived",
};

export const ESCALATION_SEVERITY_LABELS: Record<EscalationSeverity, string> = {
  info: "Info",
  warning: "Warning",
  high: "High",
  critical: "Critical",
};

// ── Required docs by loan type + employment type ────────────

export const REQUIRED_DOCS_BY_LOAN_TYPE: Record<string, RequiredDocType[]> = {
  purchase: [
    "pay_stub",
    "w2",
    "bank_statement",
    "government_id",
    "purchase_contract",
  ],
  refinance: [
    "pay_stub",
    "w2",
    "bank_statement",
    "government_id",
    "mortgage_statement",
    "homeowners_insurance",
  ],
  heloc: [
    "pay_stub",
    "w2",
    "bank_statement",
    "government_id",
    "mortgage_statement",
  ],
  va: [
    "pay_stub",
    "w2",
    "bank_statement",
    "government_id",
    "purchase_contract",
    "dd214",
    "va_coe",
  ],
  fha: [
    "pay_stub",
    "w2",
    "bank_statement",
    "government_id",
    "purchase_contract",
    "fha_case_number",
  ],
  usda: [
    "pay_stub",
    "w2",
    "bank_statement",
    "government_id",
    "purchase_contract",
  ],
  non_qm: [
    "bank_statement",
    "government_id",
  ],
};

/** Additional docs required for self-employed borrowers. */
export const SELF_EMPLOYED_ADDITIONAL_DOCS: RequiredDocType[] = [
  "tax_return_1040",
  "schedule_c",
  "profit_loss_statement",
];

/** Confidence threshold below which escalation is triggered. */
export const CONFIDENCE_THRESHOLD = 0.75;

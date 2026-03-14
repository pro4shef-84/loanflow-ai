import type {
  RequiredDocType,
  EscalationCategory,
  FileCompletionEventType,
} from "./enums";

/** Human-readable labels for document types. */
export const DOC_TYPE_LABELS: Record<RequiredDocType, string> = {
  pay_stub: "Pay Stub",
  w2: "W-2",
  bank_statement: "Bank Statement",
  government_id: "Government ID",
  purchase_contract: "Purchase Contract",
  mortgage_statement: "Mortgage Statement",
  homeowners_insurance: "Homeowners Insurance",
  tax_return_1040: "Tax Return (1040)",
  schedule_c: "Schedule C",
  profit_loss_statement: "Profit & Loss Statement",
  dd214: "DD-214",
  va_coe: "VA Certificate of Eligibility",
  fha_case_number: "FHA Case Number",
  unknown_document: "Unknown Document",
};

/** Human-readable labels for escalation categories. */
export const ESCALATION_CATEGORY_LABELS: Record<EscalationCategory, string> = {
  low_confidence_classification: "Low Confidence Classification",
  borrower_advisory_question: "Borrower Question",
  repeated_failed_upload: "Repeated Failed Upload",
  borrower_unresponsive: "Borrower Unresponsive",
  name_mismatch: "Name Mismatch",
  contradictory_data: "Contradictory Data",
  suspicious_document: "Suspicious Document",
  unsupported_scenario: "Unsupported Scenario",
  system_processing_failure: "System Processing Failure",
  borrower_frustration_signal: "Borrower Frustration",
};

/** Human-readable labels for timeline event types. */
export const EVENT_TYPE_LABELS: Record<FileCompletionEventType, string> = {
  checklist_generated: "Checklist Generated",
  borrower_invited: "Borrower Invited",
  document_uploaded: "Document Uploaded",
  document_classified: "Document Classified",
  document_validated: "Document Validated",
  document_rejected: "Document Rejected",
  document_superseded: "Document Superseded",
  requirement_state_changed: "Requirement Updated",
  doc_workflow_transition: "Workflow Transition",
  escalation_created: "Escalation Created",
  escalation_acknowledged: "Escalation Acknowledged",
  escalation_resolved: "Escalation Resolved",
  escalation_dismissed: "Escalation Dismissed",
  reminder_sent: "Reminder Sent",
  officer_review_submitted: "Officer Review Submitted",
  officer_waived_requirement: "Requirement Waived",
  officer_confirmed_requirement: "Requirement Confirmed",
  file_marked_complete: "File Marked Complete",
};

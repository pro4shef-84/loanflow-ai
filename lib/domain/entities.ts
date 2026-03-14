// ============================================================
// FILE COMPLETION ENGINE — Domain Entity Interfaces
// Adapted from mortgage-ai for loanflow-ai's table structure
// ============================================================

import type {
  DocWorkflowState,
  DocumentRequirementState,
  UploadedDocumentState,
  EscalationStatus,
  EscalationSeverity,
  EscalationCategory,
  RequiredDocType,
  ReviewDecisionType,
  ReminderChannel,
  FileCompletionEventType,
} from "./enums";
import type { Json } from "@/lib/types/database.types";

/** A single document requirement (checklist item) for a loan file. */
export interface DocumentRequirement {
  id: string;
  loan_file_id: string;
  doc_type: RequiredDocType;
  state: DocumentRequirementState;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** An escalation requiring officer attention. */
export interface Escalation {
  id: string;
  loan_file_id: string;
  document_id: string | null;
  category: EscalationCategory;
  severity: EscalationSeverity;
  status: EscalationStatus;
  owner_id: string | null;
  description: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** An officer's review decision — immutable audit trail entry. */
export interface ReviewDecision {
  id: string;
  loan_file_id: string;
  user_id: string;
  decision: ReviewDecisionType;
  notes: string | null;
  document_snapshot: Json | null;
  created_at: string;
}

/** A reminder sent to the borrower for a document requirement. */
export interface DocumentReminder {
  id: string;
  loan_file_id: string;
  requirement_id: string | null;
  reminder_number: number;
  channel: ReminderChannel;
  status: string;
  sent_at: string;
  created_at: string;
}

/** An event in the file completion audit trail. */
export interface FileCompletionEvent {
  id: string;
  loan_file_id: string | null;
  event_type: FileCompletionEventType;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// AI Output Types
// ============================================================

/** Result of AI document classification. */
export interface DocumentClassificationResult {
  doc_type: RequiredDocType;
  confidence_score: number;
  rationale: string;
  extracted_fields: Record<string, string>;
}

/** Officer copilot summary — AI-generated overview for the officer. */
export interface OfficerReviewSummary {
  loan_file_id: string;
  overall_status: DocWorkflowState;
  unresolved_issues: string[];
  confidence_flags: string[];
  recommended_actions: string[];
  document_summaries: Array<{
    doc_type: RequiredDocType;
    state: DocumentRequirementState;
    issues: string[];
  }>;
}

/** Result of deterministic document validation. */
export interface DocumentValidationResult {
  valid: boolean;
  issues: string[];
  missing_fields: string[];
  warnings: string[];
}

// ============================================================
// Workflow Result Types
// ============================================================

/** Result from any state machine transition. */
export interface TransitionResult<TState extends string> {
  success: boolean;
  previous_state: TState;
  new_state: TState;
  error?: string;
}

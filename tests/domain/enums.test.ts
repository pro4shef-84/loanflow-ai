import { describe, it, expect } from "vitest";
import {
  REQUIRED_DOCS_BY_LOAN_TYPE,
  SELF_EMPLOYED_ADDITIONAL_DOCS,
  CONFIDENCE_THRESHOLD,
  DOC_WORKFLOW_STATE_LABELS,
  REQUIREMENT_STATE_LABELS,
  ESCALATION_SEVERITY_LABELS,
} from "@/lib/domain/enums";
import {
  DOC_TYPE_LABELS,
  ESCALATION_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
} from "@/lib/domain/labels";
import type {
  DocWorkflowState,
  DocumentRequirementState,
  EscalationSeverity,
  RequiredDocType,
  EscalationCategory,
  FileCompletionEventType,
} from "@/lib/domain/enums";

// ── Loan-type document requirements ──────────────────────────

describe("REQUIRED_DOCS_BY_LOAN_TYPE", () => {
  const ALL_LOAN_TYPES = [
    "purchase",
    "refinance",
    "heloc",
    "va",
    "fha",
    "usda",
    "non_qm",
  ] as const;

  it("covers all 7 loan types", () => {
    for (const lt of ALL_LOAN_TYPES) {
      expect(REQUIRED_DOCS_BY_LOAN_TYPE).toHaveProperty(lt);
      expect(Array.isArray(REQUIRED_DOCS_BY_LOAN_TYPE[lt])).toBe(true);
    }
  });

  it.each(ALL_LOAN_TYPES)(
    "%s includes at least government_id and bank_statement",
    (loanType) => {
      const docs = REQUIRED_DOCS_BY_LOAN_TYPE[loanType];
      expect(docs).toContain("government_id");
      expect(docs).toContain("bank_statement");
    }
  );

  it("VA loans include dd214 and va_coe", () => {
    const vaDocs = REQUIRED_DOCS_BY_LOAN_TYPE["va"];
    expect(vaDocs).toContain("dd214");
    expect(vaDocs).toContain("va_coe");
  });

  it("FHA loans include fha_case_number", () => {
    const fhaDocs = REQUIRED_DOCS_BY_LOAN_TYPE["fha"];
    expect(fhaDocs).toContain("fha_case_number");
  });
});

// ── Self-employed additional docs ────────────────────────────

describe("SELF_EMPLOYED_ADDITIONAL_DOCS", () => {
  it("includes tax_return_1040", () => {
    expect(SELF_EMPLOYED_ADDITIONAL_DOCS).toContain("tax_return_1040");
  });

  it("includes schedule_c", () => {
    expect(SELF_EMPLOYED_ADDITIONAL_DOCS).toContain("schedule_c");
  });

  it("includes profit_loss_statement", () => {
    expect(SELF_EMPLOYED_ADDITIONAL_DOCS).toContain("profit_loss_statement");
  });
});

// ── Confidence threshold ────────────────────────────────────

describe("CONFIDENCE_THRESHOLD", () => {
  it("is 0.75", () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.75);
  });
});

// ── Label maps completeness ──────────────────────────────────

describe("Label maps", () => {
  it("DOC_WORKFLOW_STATE_LABELS has entries for every DocWorkflowState", () => {
    const allStates: DocWorkflowState[] = [
      "checklist_pending",
      "awaiting_documents",
      "documents_in_review",
      "corrections_needed",
      "borrower_unresponsive",
      "officer_review_needed",
      "review_ready",
      "file_complete",
    ];
    for (const state of allStates) {
      expect(DOC_WORKFLOW_STATE_LABELS[state]).toBeDefined();
      expect(typeof DOC_WORKFLOW_STATE_LABELS[state]).toBe("string");
    }
  });

  it("REQUIREMENT_STATE_LABELS has entries for every DocumentRequirementState", () => {
    const allStates: DocumentRequirementState[] = [
      "required",
      "awaiting_upload",
      "uploaded_pending_validation",
      "tentatively_satisfied",
      "correction_required",
      "needs_officer_review",
      "confirmed_by_officer",
      "waived_by_officer",
    ];
    for (const state of allStates) {
      expect(REQUIREMENT_STATE_LABELS[state]).toBeDefined();
      expect(typeof REQUIREMENT_STATE_LABELS[state]).toBe("string");
    }
  });

  it("ESCALATION_SEVERITY_LABELS has entries for every EscalationSeverity", () => {
    const allSeverities: EscalationSeverity[] = [
      "info",
      "warning",
      "high",
      "critical",
    ];
    for (const sev of allSeverities) {
      expect(ESCALATION_SEVERITY_LABELS[sev]).toBeDefined();
      expect(typeof ESCALATION_SEVERITY_LABELS[sev]).toBe("string");
    }
  });

  it("DOC_TYPE_LABELS has entries for every RequiredDocType", () => {
    const allDocTypes: RequiredDocType[] = [
      "pay_stub",
      "w2",
      "bank_statement",
      "government_id",
      "purchase_contract",
      "mortgage_statement",
      "homeowners_insurance",
      "tax_return_1040",
      "schedule_c",
      "profit_loss_statement",
      "dd214",
      "va_coe",
      "fha_case_number",
      "unknown_document",
    ];
    for (const dt of allDocTypes) {
      expect(DOC_TYPE_LABELS[dt]).toBeDefined();
      expect(typeof DOC_TYPE_LABELS[dt]).toBe("string");
    }
  });

  it("ESCALATION_CATEGORY_LABELS has entries for every EscalationCategory", () => {
    const allCategories: EscalationCategory[] = [
      "low_confidence_classification",
      "borrower_advisory_question",
      "repeated_failed_upload",
      "borrower_unresponsive",
      "name_mismatch",
      "contradictory_data",
      "suspicious_document",
      "unsupported_scenario",
      "system_processing_failure",
      "borrower_frustration_signal",
    ];
    for (const cat of allCategories) {
      expect(ESCALATION_CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof ESCALATION_CATEGORY_LABELS[cat]).toBe("string");
    }
  });

  it("EVENT_TYPE_LABELS has entries for every FileCompletionEventType", () => {
    const allEvents: FileCompletionEventType[] = [
      "checklist_generated",
      "borrower_invited",
      "document_uploaded",
      "document_classified",
      "document_validated",
      "document_rejected",
      "document_superseded",
      "requirement_state_changed",
      "doc_workflow_transition",
      "escalation_created",
      "escalation_acknowledged",
      "escalation_resolved",
      "escalation_dismissed",
      "reminder_sent",
      "officer_review_submitted",
      "officer_waived_requirement",
      "officer_confirmed_requirement",
      "file_marked_complete",
    ];
    for (const evt of allEvents) {
      expect(EVENT_TYPE_LABELS[evt]).toBeDefined();
      expect(typeof EVENT_TYPE_LABELS[evt]).toBe("string");
    }
  });
});

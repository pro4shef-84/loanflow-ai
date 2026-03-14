import { describe, it, expect } from "vitest";
import {
  canTransitionDocWorkflow,
  canTransitionRequirement,
  canTransitionDocument,
  canTransitionEscalation,
  allRequirementsSatisfied,
  anyRequirementNeedsCorrection,
  anyRequirementNeedsOfficerReview,
  hasOpenEscalation,
} from "@/lib/domain/rules/workflowRules";

// ── Doc Workflow Transitions ─────────────────────────────────

describe("canTransitionDocWorkflow", () => {
  it("checklist_pending -> awaiting_documents by system: allowed", () => {
    expect(canTransitionDocWorkflow("checklist_pending", "awaiting_documents", "system")).toBe(true);
  });

  it("checklist_pending -> awaiting_documents by officer: NOT allowed", () => {
    expect(canTransitionDocWorkflow("checklist_pending", "awaiting_documents", "officer")).toBe(false);
  });

  it("awaiting_documents -> documents_in_review by system: allowed", () => {
    expect(canTransitionDocWorkflow("awaiting_documents", "documents_in_review", "system")).toBe(true);
  });

  it("documents_in_review -> corrections_needed by system: allowed", () => {
    expect(canTransitionDocWorkflow("documents_in_review", "corrections_needed", "system")).toBe(true);
  });

  it("corrections_needed -> documents_in_review by system: allowed", () => {
    expect(canTransitionDocWorkflow("corrections_needed", "documents_in_review", "system")).toBe(true);
  });

  it("corrections_needed -> documents_in_review by borrower: allowed", () => {
    expect(canTransitionDocWorkflow("corrections_needed", "documents_in_review", "borrower")).toBe(true);
  });

  it("documents_in_review -> officer_review_needed by system: allowed", () => {
    expect(canTransitionDocWorkflow("documents_in_review", "officer_review_needed", "system")).toBe(true);
  });

  it("officer_review_needed -> review_ready by officer: allowed", () => {
    expect(canTransitionDocWorkflow("officer_review_needed", "review_ready", "officer")).toBe(true);
  });

  it("officer_review_needed -> review_ready by system: NOT allowed", () => {
    expect(canTransitionDocWorkflow("officer_review_needed", "review_ready", "system")).toBe(false);
  });

  it("review_ready -> file_complete by officer: allowed", () => {
    expect(canTransitionDocWorkflow("review_ready", "file_complete", "officer")).toBe(true);
  });

  it("awaiting_documents -> borrower_unresponsive by system: allowed", () => {
    expect(canTransitionDocWorkflow("awaiting_documents", "borrower_unresponsive", "system")).toBe(true);
  });

  it("borrower_unresponsive -> awaiting_documents by officer: allowed", () => {
    expect(canTransitionDocWorkflow("borrower_unresponsive", "awaiting_documents", "officer")).toBe(true);
  });

  it("checklist_pending -> file_complete: NOT allowed (skipping states)", () => {
    expect(canTransitionDocWorkflow("checklist_pending", "file_complete", "system")).toBe(false);
    expect(canTransitionDocWorkflow("checklist_pending", "file_complete", "officer")).toBe(false);
  });

  it("review_ready -> checklist_pending: NOT allowed (no backward to start)", () => {
    expect(canTransitionDocWorkflow("review_ready", "checklist_pending", "system")).toBe(false);
    expect(canTransitionDocWorkflow("review_ready", "checklist_pending", "officer")).toBe(false);
  });

  it("officer_review_needed -> documents_in_review by officer: allowed", () => {
    expect(canTransitionDocWorkflow("officer_review_needed", "documents_in_review", "officer")).toBe(true);
  });

  it("officer_review_needed -> corrections_needed by officer: allowed", () => {
    expect(canTransitionDocWorkflow("officer_review_needed", "corrections_needed", "officer")).toBe(true);
  });
});

// ── Requirement State Transitions ────────────────────────────

describe("canTransitionRequirement", () => {
  it("required -> awaiting_upload: allowed", () => {
    expect(canTransitionRequirement("required", "awaiting_upload")).toBe(true);
  });

  it("awaiting_upload -> uploaded_pending_validation: allowed", () => {
    expect(canTransitionRequirement("awaiting_upload", "uploaded_pending_validation")).toBe(true);
  });

  it("uploaded_pending_validation -> tentatively_satisfied: allowed", () => {
    expect(canTransitionRequirement("uploaded_pending_validation", "tentatively_satisfied")).toBe(true);
  });

  it("uploaded_pending_validation -> correction_required: allowed", () => {
    expect(canTransitionRequirement("uploaded_pending_validation", "correction_required")).toBe(true);
  });

  it("uploaded_pending_validation -> needs_officer_review: allowed", () => {
    expect(canTransitionRequirement("uploaded_pending_validation", "needs_officer_review")).toBe(true);
  });

  it("needs_officer_review -> waived_by_officer: allowed", () => {
    expect(canTransitionRequirement("needs_officer_review", "waived_by_officer")).toBe(true);
  });

  it("required -> waived_by_officer: allowed (officer can waive without upload)", () => {
    expect(canTransitionRequirement("required", "waived_by_officer")).toBe(true);
  });

  it("tentatively_satisfied -> required: NOT allowed (no backward)", () => {
    expect(canTransitionRequirement("tentatively_satisfied", "required")).toBe(false);
  });

  it("waived_by_officer -> required: NOT allowed (terminal)", () => {
    expect(canTransitionRequirement("waived_by_officer", "required")).toBe(false);
  });

  it("correction_required -> uploaded_pending_validation: allowed (re-upload)", () => {
    expect(canTransitionRequirement("correction_required", "uploaded_pending_validation")).toBe(true);
  });

  it("tentatively_satisfied -> confirmed_by_officer: allowed", () => {
    expect(canTransitionRequirement("tentatively_satisfied", "confirmed_by_officer")).toBe(true);
  });

  it("tentatively_satisfied -> correction_required: allowed", () => {
    expect(canTransitionRequirement("tentatively_satisfied", "correction_required")).toBe(true);
  });

  it("awaiting_upload -> waived_by_officer: allowed", () => {
    expect(canTransitionRequirement("awaiting_upload", "waived_by_officer")).toBe(true);
  });
});

// ── Uploaded Document State Transitions ─────────────────────

describe("canTransitionDocument", () => {
  it("received -> processing: allowed", () => {
    expect(canTransitionDocument("received", "processing")).toBe(true);
  });

  it("received -> precheck_failed: allowed", () => {
    expect(canTransitionDocument("received", "precheck_failed")).toBe(true);
  });

  it("processing -> classified: allowed", () => {
    expect(canTransitionDocument("processing", "classified")).toBe(true);
  });

  it("classified -> validated_ok: allowed", () => {
    expect(canTransitionDocument("classified", "validated_ok")).toBe(true);
  });

  it("classified -> validated_issue_found: allowed", () => {
    expect(canTransitionDocument("classified", "validated_issue_found")).toBe(true);
  });

  it("validated_ok -> accepted_tentatively: allowed", () => {
    expect(canTransitionDocument("validated_ok", "accepted_tentatively")).toBe(true);
  });

  it("validated_issue_found -> rejected: allowed", () => {
    expect(canTransitionDocument("validated_issue_found", "rejected")).toBe(true);
  });

  it("accepted_tentatively -> superseded: allowed", () => {
    expect(canTransitionDocument("accepted_tentatively", "superseded")).toBe(true);
  });

  it("rejected -> processing: NOT allowed", () => {
    expect(canTransitionDocument("rejected", "processing")).toBe(false);
  });

  it("rejected -> superseded: allowed (superseded overrides rejected)", () => {
    expect(canTransitionDocument("rejected", "superseded")).toBe(true);
  });

  it("processing -> needs_officer_review: allowed", () => {
    expect(canTransitionDocument("processing", "needs_officer_review")).toBe(true);
  });

  it("needs_officer_review -> accepted_tentatively: allowed", () => {
    expect(canTransitionDocument("needs_officer_review", "accepted_tentatively")).toBe(true);
  });

  it("needs_officer_review -> rejected: allowed", () => {
    expect(canTransitionDocument("needs_officer_review", "rejected")).toBe(true);
  });
});

// ── Escalation State Transitions ────────────────────────────

describe("canTransitionEscalation", () => {
  it("open -> acknowledged: allowed", () => {
    expect(canTransitionEscalation("open", "acknowledged")).toBe(true);
  });

  it("open -> resolved: allowed", () => {
    expect(canTransitionEscalation("open", "resolved")).toBe(true);
  });

  it("open -> dismissed: allowed", () => {
    expect(canTransitionEscalation("open", "dismissed")).toBe(true);
  });

  it("acknowledged -> resolved: allowed", () => {
    expect(canTransitionEscalation("acknowledged", "resolved")).toBe(true);
  });

  it("acknowledged -> dismissed: allowed", () => {
    expect(canTransitionEscalation("acknowledged", "dismissed")).toBe(true);
  });

  it("resolved -> open: NOT allowed (terminal)", () => {
    expect(canTransitionEscalation("resolved", "open")).toBe(false);
  });

  it("dismissed -> open: NOT allowed (terminal)", () => {
    expect(canTransitionEscalation("dismissed", "open")).toBe(false);
  });

  it("resolved -> acknowledged: NOT allowed", () => {
    expect(canTransitionEscalation("resolved", "acknowledged")).toBe(false);
  });

  it("dismissed -> acknowledged: NOT allowed", () => {
    expect(canTransitionEscalation("dismissed", "acknowledged")).toBe(false);
  });
});

// ── Aggregation Functions ───────────────────────────────────

describe("allRequirementsSatisfied", () => {
  it("returns true when all states are satisfied (tentatively_satisfied/confirmed/waived)", () => {
    expect(
      allRequirementsSatisfied([
        "tentatively_satisfied",
        "confirmed_by_officer",
        "waived_by_officer",
      ])
    ).toBe(true);
  });

  it("returns false when any is correction_required", () => {
    expect(
      allRequirementsSatisfied([
        "tentatively_satisfied",
        "correction_required",
        "waived_by_officer",
      ])
    ).toBe(false);
  });

  it("returns false on empty array", () => {
    expect(allRequirementsSatisfied([])).toBe(false);
  });

  it("returns true when all are tentatively_satisfied", () => {
    expect(
      allRequirementsSatisfied([
        "tentatively_satisfied",
        "tentatively_satisfied",
      ])
    ).toBe(true);
  });

  it("returns false when any is awaiting_upload", () => {
    expect(
      allRequirementsSatisfied([
        "tentatively_satisfied",
        "awaiting_upload",
      ])
    ).toBe(false);
  });
});

describe("anyRequirementNeedsCorrection", () => {
  it("returns true when one is correction_required", () => {
    expect(
      anyRequirementNeedsCorrection([
        "tentatively_satisfied",
        "correction_required",
      ])
    ).toBe(true);
  });

  it("returns false when none is correction_required", () => {
    expect(
      anyRequirementNeedsCorrection([
        "tentatively_satisfied",
        "awaiting_upload",
      ])
    ).toBe(false);
  });

  it("returns false on empty array", () => {
    expect(anyRequirementNeedsCorrection([])).toBe(false);
  });
});

describe("anyRequirementNeedsOfficerReview", () => {
  it("returns true when one is needs_officer_review", () => {
    expect(
      anyRequirementNeedsOfficerReview([
        "tentatively_satisfied",
        "needs_officer_review",
      ])
    ).toBe(true);
  });

  it("returns false when none needs officer review", () => {
    expect(
      anyRequirementNeedsOfficerReview([
        "tentatively_satisfied",
        "confirmed_by_officer",
      ])
    ).toBe(false);
  });
});

describe("hasOpenEscalation", () => {
  it("returns true for open", () => {
    expect(hasOpenEscalation(["open"])).toBe(true);
  });

  it("returns true for acknowledged", () => {
    expect(hasOpenEscalation(["acknowledged"])).toBe(true);
  });

  it("returns false for resolved", () => {
    expect(hasOpenEscalation(["resolved"])).toBe(false);
  });

  it("returns false for dismissed", () => {
    expect(hasOpenEscalation(["dismissed"])).toBe(false);
  });

  it("returns true when mix of resolved and open", () => {
    expect(hasOpenEscalation(["resolved", "open"])).toBe(true);
  });

  it("returns false on empty array", () => {
    expect(hasOpenEscalation([])).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  matchConditionToRequirement,
} from "@/lib/utils/condition-matcher";
import type { DocumentRequirementRef } from "@/lib/utils/condition-matcher";

// Standard set of requirements covering all doc types
const ALL_REQUIREMENTS: DocumentRequirementRef[] = [
  { id: "req-1", doc_type: "pay_stub" },
  { id: "req-2", doc_type: "w2" },
  { id: "req-3", doc_type: "bank_statement" },
  { id: "req-4", doc_type: "government_id" },
  { id: "req-5", doc_type: "purchase_contract" },
  { id: "req-6", doc_type: "tax_return_1040" },
  { id: "req-7", doc_type: "schedule_c" },
  { id: "req-8", doc_type: "profit_loss_statement" },
  { id: "req-9", doc_type: "mortgage_statement" },
  { id: "req-10", doc_type: "homeowners_insurance" },
  { id: "req-11", doc_type: "dd214" },
  { id: "req-12", doc_type: "va_coe" },
  { id: "req-13", doc_type: "fha_case_number" },
];

describe("matchConditionToRequirement", () => {
  it("'Please provide most recent pay stub' matches pay_stub at 0.95", () => {
    const result = matchConditionToRequirement(
      "Please provide most recent pay stub",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("pay_stub");
    expect(result!.confidence).toBe(0.95);
    expect(result!.requirementId).toBe("req-1");
  });

  it("'W-2 form needed' matches w2 at 0.7", () => {
    const result = matchConditionToRequirement(
      "W-2 form needed",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("w2");
    // "w-2 form" is a phrase match -> 0.95
    // Actually "w-2 form" is in phrases list, so it matches at 0.95
    // But "W-2 form needed" lowered is "w-2 form needed" which includes "w-2 form"
    expect(result!.confidence).toBe(0.95);
  });

  it("'Two months bank statements required' matches bank_statement at 0.95", () => {
    const result = matchConditionToRequirement(
      "Two months bank statements required",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("bank_statement");
    // "bank statements" is a keyword match, and "two months bank statements" is not an exact phrase
    // But let's check: phrases include "two months bank statements"? Yes!
    // Wait: the phrase is "two months bank statements"
    // The input lowered: "two months bank statements required" includes "two months bank statements"
    expect(result!.confidence).toBe(0.95);
  });

  it("'Valid government-issued ID' matches government_id at 0.95", () => {
    const result = matchConditionToRequirement(
      "Valid government-issued ID",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("government_id");
    // phrase: "valid government-issued id"
    expect(result!.confidence).toBe(0.95);
  });

  it("'Fully executed purchase contract' matches purchase_contract at 0.95", () => {
    const result = matchConditionToRequirement(
      "Fully executed purchase contract",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("purchase_contract");
    expect(result!.confidence).toBe(0.95);
  });

  it("'Random unrelated text about the weather' returns null", () => {
    const result = matchConditionToRequirement(
      "Random unrelated text about the weather",
      ALL_REQUIREMENTS
    );
    expect(result).toBeNull();
  });

  it("empty text returns null", () => {
    const result = matchConditionToRequirement("", ALL_REQUIREMENTS);
    expect(result).toBeNull();
  });

  it("empty requirements returns null", () => {
    const result = matchConditionToRequirement("Please provide most recent pay stub", []);
    expect(result).toBeNull();
  });

  it("no matching requirement for matched doc type returns null", () => {
    // Condition matches pay_stub, but requirements only have bank_statement
    const limitedReqs: DocumentRequirementRef[] = [
      { id: "req-3", doc_type: "bank_statement" },
    ];
    const result = matchConditionToRequirement(
      "Please provide most recent pay stub",
      limitedReqs
    );
    expect(result).toBeNull();
  });

  it("keyword-only match returns lower confidence", () => {
    // "bank statement" is a keyword, not a phrase match
    const result = matchConditionToRequirement(
      "Provide your bank statement",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("bank_statement");
    expect(result!.confidence).toBe(0.7);
  });

  it("multiple keyword matches boost confidence", () => {
    // "bank statement" and "bank statements" are both keywords
    const result = matchConditionToRequirement(
      "Please upload bank statement or bank statements for checking account",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("bank_statement");
    // Multiple keyword matches: base 0.7 + boost
    expect(result!.confidence).toBeGreaterThan(0.7);
  });

  it("matches mortgage statement condition", () => {
    const result = matchConditionToRequirement(
      "Current mortgage statement showing loan balance",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("mortgage_statement");
    // "current mortgage statement" is a phrase match
    expect(result!.confidence).toBe(0.95);
  });

  it("matches homeowners insurance condition", () => {
    const result = matchConditionToRequirement(
      "Proof of homeowners insurance with declaration page",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("homeowners_insurance");
    expect(result!.confidence).toBe(0.95);
  });

  it("matches dd214 condition", () => {
    const result = matchConditionToRequirement(
      "Copy of DD-214 for military service verification",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("dd214");
    expect(result!.confidence).toBe(0.95);
  });

  it("matches VA certificate of eligibility", () => {
    const result = matchConditionToRequirement(
      "VA certificate of eligibility required",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("va_coe");
    expect(result!.confidence).toBe(0.95);
  });

  it("matches FHA case number", () => {
    const result = matchConditionToRequirement(
      "FHA case number assignment needed",
      ALL_REQUIREMENTS
    );
    expect(result).not.toBeNull();
    expect(result!.docType).toBe("fha_case_number");
    // "fha case" is a keyword, "case number assignment" is also a keyword
    // But "fha case number" is a phrase
    expect(result!.confidence).toBe(0.95);
  });
});

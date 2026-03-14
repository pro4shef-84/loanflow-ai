// ============================================================
// CHECKLIST AGENT TESTS
// Tests checklist generation logic with mocked Supabase
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChecklistAgent } from "@/lib/agents/checklistAgent";
import { createMockSupabase, findCalls, type MockResponses } from "../helpers/mockSupabase";
import {
  REQUIRED_DOCS_BY_LOAN_TYPE,
  SELF_EMPLOYED_ADDITIONAL_DOCS,
} from "@/lib/domain/enums";

describe("ChecklistAgent", () => {
  let agent: ChecklistAgent;

  beforeEach(() => {
    agent = new ChecklistAgent();
  });

  // ── getRequiredDocTypes (pure logic, no DB) ───────────────

  describe("getRequiredDocTypes()", () => {
    it("should return 5 requirements for a purchase loan", () => {
      const docs = agent.getRequiredDocTypes("purchase");
      expect(docs).toEqual(REQUIRED_DOCS_BY_LOAN_TYPE["purchase"]);
      expect(docs).toHaveLength(5);
      expect(docs).toContain("pay_stub");
      expect(docs).toContain("w2");
      expect(docs).toContain("bank_statement");
      expect(docs).toContain("government_id");
      expect(docs).toContain("purchase_contract");
    });

    it("should return 7 requirements for a VA loan (includes dd214, va_coe)", () => {
      const docs = agent.getRequiredDocTypes("va");
      expect(docs).toHaveLength(7);
      expect(docs).toContain("dd214");
      expect(docs).toContain("va_coe");
      expect(docs).toContain("pay_stub");
      expect(docs).toContain("w2");
      expect(docs).toContain("bank_statement");
      expect(docs).toContain("government_id");
      expect(docs).toContain("purchase_contract");
    });

    it("should return 6 requirements for an FHA loan (includes fha_case_number)", () => {
      const docs = agent.getRequiredDocTypes("fha");
      expect(docs).toHaveLength(6);
      expect(docs).toContain("fha_case_number");
      expect(docs).toContain("pay_stub");
      expect(docs).toContain("w2");
      expect(docs).toContain("bank_statement");
      expect(docs).toContain("government_id");
      expect(docs).toContain("purchase_contract");
    });

    it("should add self-employed docs for self_employed employment type", () => {
      const docs = agent.getRequiredDocTypes("purchase", "self_employed");
      expect(docs).toContain("tax_return_1040");
      expect(docs).toContain("schedule_c");
      expect(docs).toContain("profit_loss_statement");
      // Should still have the base docs
      expect(docs).toContain("pay_stub");
      expect(docs).toContain("w2");
      // Total: 5 base + 3 self-employed = 8
      expect(docs).toHaveLength(8);
    });

    it("should add self-employed docs for 1099 employment type", () => {
      const docs = agent.getRequiredDocTypes("purchase", "1099");
      expect(docs).toContain("tax_return_1040");
      expect(docs).toContain("schedule_c");
      expect(docs).toContain("profit_loss_statement");
      expect(docs).toHaveLength(8);
    });

    it("should NOT add self-employed docs for w2 employment type", () => {
      const docs = agent.getRequiredDocTypes("purchase", "w2");
      expect(docs).not.toContain("tax_return_1040");
      expect(docs).not.toContain("schedule_c");
      expect(docs).not.toContain("profit_loss_statement");
      expect(docs).toHaveLength(5);
    });

    it("should NOT add self-employed docs for retired employment type", () => {
      const docs = agent.getRequiredDocTypes("purchase", "retired");
      expect(docs).not.toContain("tax_return_1040");
      expect(docs).toHaveLength(5);
    });

    it("should return empty array for unsupported loan type", () => {
      const docs = agent.getRequiredDocTypes("imaginary_loan");
      expect(docs).toEqual([]);
    });

    it("should not duplicate docs if self-employed docs overlap with base", () => {
      // non_qm only has bank_statement and government_id
      const docs = agent.getRequiredDocTypes("non_qm", "self_employed");
      // 2 base + 3 self-employed = 5
      expect(docs).toHaveLength(5);
      // No duplicates
      const unique = new Set(docs);
      expect(unique.size).toBe(docs.length);
    });
  });

  // ── generateChecklistWithClient (DB-backed) ───────────────

  describe("generateChecklistWithClient()", () => {
    it("should skip generation if requirements already exist (idempotent)", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [
            { id: "req-1", doc_type: "pay_stub" },
            { id: "req-2", doc_type: "w2" },
          ],
          error: null,
        },
      };

      const { client, calls } = createMockSupabase(responses);

      const result = await agent.generateChecklistWithClient(client, {
        loanFileId: "loan-123",
        loanType: "purchase",
      });

      expect(result.success).toBe(true);
      expect(result.requirements).toEqual(["req-1", "req-2"]);

      // Should NOT have inserted any new records
      const insertCalls = findCalls(calls, "document_requirements", "insert");
      expect(insertCalls.length).toBe(0);
    });

    it("should create requirements for a valid loan type with no existing records", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [],
          error: null,
        },
        "document_requirements.insert": {
          data: [
            { id: "req-1" },
            { id: "req-2" },
            { id: "req-3" },
            { id: "req-4" },
            { id: "req-5" },
          ],
          error: null,
        },
        "loan_files.update": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);

      const result = await agent.generateChecklistWithClient(client, {
        loanFileId: "loan-123",
        loanType: "purchase",
      });

      expect(result.success).toBe(true);
      expect(result.requirements).toHaveLength(5);

      // Verify insert was called
      const insertCalls = findCalls(calls, "document_requirements", "insert");
      expect(insertCalls.length).toBeGreaterThan(0);

      // Verify loan_files was updated with checklist_generated_at
      const updateCalls = findCalls(calls, "loan_files", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it("should return error for unsupported loan type", async () => {
      const { client } = createMockSupabase({});

      const result = await agent.generateChecklistWithClient(client, {
        loanFileId: "loan-123",
        loanType: "jumbo_magic",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported loan type");
      expect(result.requirements).toEqual([]);
    });

    it("should return error on DB fetch failure", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: null,
          error: { message: "Connection refused" },
        },
      };

      const { client } = createMockSupabase(responses);

      const result = await agent.generateChecklistWithClient(client, {
        loanFileId: "loan-123",
        loanType: "purchase",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to check existing requirements");
    });

    it("should return error on DB insert failure", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [],
          error: null,
        },
        "document_requirements.insert": {
          data: null,
          error: { message: "Unique constraint violated" },
        },
      };

      const { client } = createMockSupabase(responses);

      const result = await agent.generateChecklistWithClient(client, {
        loanFileId: "loan-123",
        loanType: "purchase",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create checklist");
    });
  });
});

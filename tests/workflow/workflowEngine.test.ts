// ============================================================
// WORKFLOW ENGINE TESTS
// Tests the WorkflowEngine class with mocked Supabase client
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowEngine } from "@/lib/workflow/workflowEngine";
import { createMockSupabase, findCalls, type MockResponses } from "../helpers/mockSupabase";

describe("WorkflowEngine", () => {
  // ── transitionDocWorkflow ─────────────────────────────────

  describe("transitionDocWorkflow()", () => {
    it("should successfully transition from checklist_pending to awaiting_documents", async () => {
      const responses: MockResponses = {
        "loan_files.select": {
          data: { doc_workflow_state: "checklist_pending" },
          error: null,
        },
        "loan_files.update": { data: null, error: null },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const result = await engine.transitionDocWorkflow(
        "loan-123",
        "awaiting_documents",
        "system"
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify update was called on loan_files
      const updateCalls = findCalls(calls, "loan_files", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it("should return { success: false } when loan is not found", async () => {
      const responses: MockResponses = {
        "loan_files.select": {
          data: null,
          error: { message: "No rows found" },
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const result = await engine.transitionDocWorkflow(
        "nonexistent-loan",
        "awaiting_documents",
        "system"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Loan file not found");
    });

    it("should return { success: false } for invalid transition", async () => {
      const responses: MockResponses = {
        "loan_files.select": {
          data: { doc_workflow_state: "checklist_pending" },
          error: null,
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      // checklist_pending -> file_complete is not a valid transition
      const result = await engine.transitionDocWorkflow(
        "loan-123",
        "file_complete",
        "system"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should reject transition when actor is not allowed", async () => {
      const responses: MockResponses = {
        "loan_files.select": {
          data: { doc_workflow_state: "checklist_pending" },
          error: null,
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      // checklist_pending -> awaiting_documents is only allowed by "system"
      const result = await engine.transitionDocWorkflow(
        "loan-123",
        "awaiting_documents",
        "borrower"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
    });
  });

  // ── transitionRequirement ─────────────────────────────────

  describe("transitionRequirement()", () => {
    it("should successfully transition a requirement", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: { state: "uploaded_pending_validation", loan_file_id: "loan-123" },
          error: null,
        },
        "document_requirements.update": { data: null, error: null },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const result = await engine.transitionRequirement(
        "req-456",
        "tentatively_satisfied"
      );

      expect(result.success).toBe(true);

      const updateCalls = findCalls(calls, "document_requirements", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it("should return { success: false } when requirement not found", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: null,
          error: { message: "No rows found" },
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const result = await engine.transitionRequirement(
        "nonexistent-req",
        "tentatively_satisfied"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Requirement not found");
    });

    it("should reject invalid requirement transition", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: { state: "required", loan_file_id: "loan-123" },
          error: null,
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      // required -> tentatively_satisfied is not a valid transition
      const result = await engine.transitionRequirement(
        "req-456",
        "tentatively_satisfied"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
    });
  });

  // ── createEscalation ──────────────────────────────────────

  describe("createEscalation()", () => {
    it("should successfully create an escalation and return its ID", async () => {
      const responses: MockResponses = {
        "escalations.insert": {
          data: { id: "esc-789" },
          error: null,
        },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const escalationId = await engine.createEscalation(
        "loan-123",
        "low_confidence_classification",
        "high",
        "Document has low confidence score",
        "doc-456"
      );

      expect(escalationId).toBe("esc-789");
    });

    it("should return null on insert failure", async () => {
      const responses: MockResponses = {
        "escalations.insert": {
          data: null,
          error: { message: "Insert failed" },
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const escalationId = await engine.createEscalation(
        "loan-123",
        "suspicious_document",
        "critical",
        "Document flagged as suspicious"
      );

      expect(escalationId).toBeNull();
    });
  });

  // ── resolveEscalation ─────────────────────────────────────

  describe("resolveEscalation()", () => {
    it("should successfully resolve an open escalation", async () => {
      const responses: MockResponses = {
        "escalations.select": {
          data: { loan_file_id: "loan-123", status: "open" },
          error: null,
        },
        "escalations.update": { data: null, error: null },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const result = await engine.resolveEscalation(
        "esc-789",
        "Document verified manually by officer",
        "user-001"
      );

      expect(result.success).toBe(true);

      const updateCalls = findCalls(calls, "escalations", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it("should return { success: false } when escalation not found", async () => {
      const responses: MockResponses = {
        "escalations.select": {
          data: null,
          error: { message: "Not found" },
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      const result = await engine.resolveEscalation(
        "nonexistent-esc",
        "Some notes",
        "user-001"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Escalation not found");
    });

    it("should return { success: false } for already resolved escalation", async () => {
      const responses: MockResponses = {
        "escalations.select": {
          data: { loan_file_id: "loan-123", status: "resolved" },
          error: null,
        },
      };

      const { client } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      // resolved -> resolved is not a valid transition
      const result = await engine.resolveEscalation(
        "esc-789",
        "Trying to resolve again",
        "user-001"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
    });
  });

  // ── evaluateLoanDocStatus ─────────────────────────────────

  describe("evaluateLoanDocStatus()", () => {
    it("should transition to officer_review_needed when all requirements satisfied", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [
            { state: "tentatively_satisfied" },
            { state: "confirmed_by_officer" },
            { state: "waived_by_officer" },
          ],
          error: null,
        },
        "loan_files.select": {
          data: { doc_workflow_state: "documents_in_review" },
          error: null,
        },
        "loan_files.update": { data: null, error: null },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      await engine.evaluateLoanDocStatus("loan-123");

      // Should have called update on loan_files to transition state
      const updateCalls = findCalls(calls, "loan_files", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it("should transition to corrections_needed when any requirement needs correction", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [
            { state: "tentatively_satisfied" },
            { state: "correction_required" },
          ],
          error: null,
        },
        "loan_files.select": {
          data: { doc_workflow_state: "documents_in_review" },
          error: null,
        },
        "loan_files.update": { data: null, error: null },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      await engine.evaluateLoanDocStatus("loan-123");

      const updateCalls = findCalls(calls, "loan_files", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it("should do nothing when not in documents_in_review state", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [{ state: "tentatively_satisfied" }],
          error: null,
        },
        "loan_files.select": {
          data: { doc_workflow_state: "awaiting_documents" },
          error: null,
        },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      await engine.evaluateLoanDocStatus("loan-123");

      // Should NOT call update because we're not in documents_in_review
      const updateCalls = findCalls(calls, "loan_files", "update");
      expect(updateCalls.length).toBe(0);
    });

    it("should do nothing when no requirements exist", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [],
          error: null,
        },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      await engine.evaluateLoanDocStatus("loan-123");

      // Should not even fetch the loan since requirements are empty
      const loanSelectCalls = findCalls(calls, "loan_files", "select");
      expect(loanSelectCalls.length).toBe(0);
    });

    it("should transition to officer_review_needed when any requirement needs officer review", async () => {
      const responses: MockResponses = {
        "document_requirements.select": {
          data: [
            { state: "tentatively_satisfied" },
            { state: "needs_officer_review" },
          ],
          error: null,
        },
        "loan_files.select": {
          data: { doc_workflow_state: "documents_in_review" },
          error: null,
        },
        "loan_files.update": { data: null, error: null },
        "file_completion_events.insert": { data: null, error: null },
      };

      const { client, calls } = createMockSupabase(responses);
      const engine = new WorkflowEngine(client);

      await engine.evaluateLoanDocStatus("loan-123");

      const updateCalls = findCalls(calls, "loan_files", "update");
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });
});

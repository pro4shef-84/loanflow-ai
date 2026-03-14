// ============================================================
// DOCUMENT INTELLIGENCE AGENT TESTS
// Tests the AI document processing pipeline with mocked
// Claude API and mocked Supabase client
// ============================================================

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { DocumentIntelligenceAgent } from "@/lib/agents/documentIntelligenceAgent";
import { createMockSupabase, findCalls, type MockResponses } from "../helpers/mockSupabase";
import { CONFIDENCE_THRESHOLD } from "@/lib/domain/enums";

// Mock the Supabase server module so createServiceClient() returns our mock
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
  createClient: vi.fn(),
}));

// Mock the Anthropic client module
vi.mock("@/lib/anthropic/client", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
  MODELS: {
    haiku: "claude-haiku-4-5-20251001",
  },
}));

// Mock the classification prompt builder
vi.mock("@/lib/anthropic/prompts/file-completion", () => ({
  documentClassificationPrompt: vi.fn(() => "mock prompt"),
}));

// Mock the schema validator to pass through
vi.mock("@/lib/anthropic/schemas/file-completion", () => ({
  DocumentIntelligenceSchema: {
    parse: (data: unknown) => data,
  },
}));

import { createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";

function makeAiResponse(overrides: Record<string, unknown> = {}) {
  return {
    doc_type: "pay_stub",
    confidence_score: 0.92,
    rationale_summary: "Document is clearly a pay stub with all expected fields.",
    extracted_fields: {
      employee_name: "John Doe",
      employer_name: "Acme Corp",
      pay_period: new Date().toISOString(),
      ytd_income: "50000",
    },
    issues: [],
    ...overrides,
  };
}

function mockClaudeResponse(aiResult: Record<string, unknown>) {
  (anthropic.messages.create as Mock).mockResolvedValue({
    content: [
      {
        type: "text",
        text: JSON.stringify(aiResult),
      },
    ],
  });
}

const DEFAULT_PARAMS = {
  documentId: "doc-123",
  loanFileId: "loan-456",
  requirementId: "req-789",
  fileName: "pay_stub_jan.pdf",
  mimeType: "application/pdf",
};

function setupMockSupabase(responses: MockResponses = {}) {
  // document_requirements.select is called multiple times in the full pipeline:
  //   1) transitionRequirement() calls .single() — expects object
  //   2) evaluateLoanDocStatus() expects array of { state }
  // loan_files.select is called multiple times:
  //   1) evaluateLoanDocStatus() first call — expects object with doc_workflow_state
  //   2) transitionDocWorkflow() — expects object with doc_workflow_state
  const defaultResponses: MockResponses = {
    "documents.select": {
      data: { classification_raw: {} },
      error: null,
    },
    "documents.update": { data: null, error: null },
    "document_requirements.select": [
      // First call: transitionRequirement() -> .single()
      { data: { state: "uploaded_pending_validation", loan_file_id: "loan-456" }, error: null },
      // Second call: evaluateLoanDocStatus() -> array of states
      { data: [{ state: "tentatively_satisfied" }], error: null },
    ],
    "document_requirements.update": { data: null, error: null },
    "escalations.insert": { data: { id: "esc-001" }, error: null },
    "file_completion_events.insert": { data: null, error: null },
    "loan_files.select": [
      // First call: evaluateLoanDocStatus() fetches requirements then loan state
      { data: { doc_workflow_state: "documents_in_review" }, error: null },
      // Second call: transitionDocWorkflow() from evaluateLoanDocStatus
      { data: { doc_workflow_state: "documents_in_review" }, error: null },
    ],
    "loan_files.update": { data: null, error: null },
    ...responses,
  };

  const mock = createMockSupabase(defaultResponses);
  (createServiceClient as Mock).mockResolvedValue(mock.client);
  return mock;
}

describe("DocumentIntelligenceAgent", () => {
  let agent: DocumentIntelligenceAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new DocumentIntelligenceAgent();
  });

  // ── High confidence processing ────────────────────────────

  describe("high confidence (>= 0.75)", () => {
    it("should process normally and run validation when confidence is high", async () => {
      const aiResult = makeAiResponse({ confidence_score: 0.92 });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.confidence_score).toBe(0.92);
      expect(result.classification).toBe("pay_stub");
      expect(result.needs_human_review).toBe(false);

      // Should have updated documents table multiple times (processing state + classification + final)
      const docUpdateCalls = findCalls(calls, "documents", "update");
      expect(docUpdateCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("should set validation_passed to true when validation passes", async () => {
      const aiResult = makeAiResponse({
        confidence_score: 0.95,
        extracted_fields: {
          employee_name: "Jane Smith",
          employer_name: "TechCo",
          pay_period: new Date().toISOString(),
          ytd_income: "75000",
        },
      });
      mockClaudeResponse(aiResult);
      setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.validation_passed).toBe(true);
      expect(result.needs_human_review).toBe(false);
    });

    it("should set validation_passed to false and transition to correction_required when validation fails", async () => {
      // Missing employer_name and ytd_income will trigger validation failure for pay_stub
      const aiResult = makeAiResponse({
        confidence_score: 0.90,
        extracted_fields: {
          employee_name: "John Doe",
          // Missing employer_name, pay_period, ytd_income
        },
      });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.validation_passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);

      // Should have transitioned requirement to correction_required
      const reqUpdateCalls = findCalls(calls, "document_requirements", "update");
      expect(reqUpdateCalls.length).toBeGreaterThan(0);
    });
  });

  // ── Low confidence processing ─────────────────────────────

  describe("low confidence (< 0.75)", () => {
    it("should create escalation and set needs_officer_review", async () => {
      const aiResult = makeAiResponse({ confidence_score: 0.55 });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.confidence_score).toBe(0.55);
      expect(result.needs_human_review).toBe(true);
      expect(result.validation_passed).toBe(false);
      expect(result.issues.some((i) => i.includes("confidence"))).toBe(true);

      // Should have created an escalation
      const escalationCalls = findCalls(calls, "escalations", "insert");
      expect(escalationCalls.length).toBeGreaterThan(0);

      // Should have transitioned requirement to needs_officer_review
      const reqUpdateCalls = findCalls(calls, "document_requirements", "update");
      expect(reqUpdateCalls.length).toBeGreaterThan(0);
    });

    it("should include confidence percentage in the issues", async () => {
      const aiResult = makeAiResponse({ confidence_score: 0.42 });
      mockClaudeResponse(aiResult);
      setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.issues.some((i) => i.includes("42%"))).toBe(true);
    });
  });

  // ── Unknown document classification ───────────────────────

  describe("unknown document classification", () => {
    it("should reject unknown documents", async () => {
      const aiResult = makeAiResponse({
        doc_type: "unknown_document",
        confidence_score: 0.80,
        issues: ["Could not determine document type"],
      });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.classification).toBe("unknown_document");
      expect(result.validation_passed).toBe(false);
      expect(result.needs_human_review).toBe(false);
      expect(result.issues.some((i) => i.includes("could not be identified"))).toBe(true);

      // Should have set document status to rejected
      const docUpdateCalls = findCalls(calls, "documents", "update");
      expect(docUpdateCalls.length).toBeGreaterThan(0);
    });
  });

  // ── Suspicious indicators ─────────────────────────────────

  describe("suspicious indicators", () => {
    it("should create critical escalation for documents with 'altered' in rationale", async () => {
      const aiResult = makeAiResponse({
        confidence_score: 0.88,
        rationale_summary: "Document appears to have been altered with editing software.",
        issues: [],
      });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.needs_human_review).toBe(true);
      expect(result.validation_passed).toBe(false);

      // Should have created an escalation
      const escalationCalls = findCalls(calls, "escalations", "insert");
      expect(escalationCalls.length).toBeGreaterThan(0);
    });

    it("should flag documents with 'modified' in issues", async () => {
      const aiResult = makeAiResponse({
        confidence_score: 0.90,
        rationale_summary: "Pay stub looks normal.",
        issues: ["Font appears modified in income section"],
      });
      mockClaudeResponse(aiResult);
      setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.needs_human_review).toBe(true);
    });

    it("should flag documents with 'suspicious' keyword", async () => {
      const aiResult = makeAiResponse({
        confidence_score: 0.85,
        rationale_summary: "Suspicious formatting detected in the document header.",
      });
      mockClaudeResponse(aiResult);
      setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.needs_human_review).toBe(true);
    });
  });

  // ── AI failure ────────────────────────────────────────────

  describe("AI classification failure", () => {
    it("should escalate for human review when Claude API fails", async () => {
      (anthropic.messages.create as Mock).mockRejectedValue(
        new Error("API rate limit exceeded")
      );
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(false);
      expect(result.classification).toBe("unknown_document");
      expect(result.confidence_score).toBe(0);
      expect(result.needs_human_review).toBe(true);
      expect(result.validation_passed).toBe(false);
      expect(result.error).toBe("AI system error");

      // Should have set document to needs_attention
      const docUpdateCalls = findCalls(calls, "documents", "update");
      expect(docUpdateCalls.length).toBeGreaterThan(0);

      // Should have created an escalation for system failure
      const escalationCalls = findCalls(calls, "escalations", "insert");
      expect(escalationCalls.length).toBeGreaterThan(0);
    });
  });

  // ── Validation pass → tentatively_satisfied ───────────────

  describe("validation outcomes", () => {
    it("should transition requirement to tentatively_satisfied on validation pass", async () => {
      const aiResult = makeAiResponse({
        confidence_score: 0.95,
        doc_type: "government_id",
        extracted_fields: {
          full_name: "John Doe",
          id_type: "drivers_license",
        },
      });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.validation_passed).toBe(true);

      // Should have updated the requirement
      const reqUpdateCalls = findCalls(calls, "document_requirements", "update");
      expect(reqUpdateCalls.length).toBeGreaterThan(0);
    });

    it("should transition requirement to correction_required on validation fail", async () => {
      // Bank statement missing required fields
      const aiResult = makeAiResponse({
        confidence_score: 0.90,
        doc_type: "bank_statement",
        extracted_fields: {
          // Missing account_holder_name, statement_date
          // all_pages not true, page_count < 2
        },
      });
      mockClaudeResponse(aiResult);
      const { calls } = setupMockSupabase();

      const result = await agent.processDocument(DEFAULT_PARAMS);

      expect(result.success).toBe(true);
      expect(result.validation_passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});

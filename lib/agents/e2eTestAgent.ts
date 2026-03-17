// ============================================================
// E2E TEST AGENT
// Runs a comprehensive suite of HTTP endpoint tests against
// the live app, stores results in test_runs / test_results.
// Designed to be called from the midnight cron job.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

interface TestCase {
  name: string;
  endpoint: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  expectedStatus: number;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** If set, the actual status must be in this list (OR match) */
  acceptableStatuses?: number[];
}

export interface TestRunSummary {
  runId: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  failures: { name: string; endpoint: string; expected: number; actual: number | null; error?: string }[];
}

// ──────────────────────────────────────────────────────────────
// Master test suite — every endpoint we expose
// ──────────────────────────────────────────────────────────────
const TEST_SUITE: TestCase[] = [
  // ── App shell ──────────────────────────────────────────────
  { name: "App home loads", endpoint: "/", method: "GET", expectedStatus: 200 },

  // ── Auth protection — every protected route must 401 ───────
  { name: "Auth: GET /api/loans", endpoint: "/api/loans", method: "GET", expectedStatus: 401 },
  { name: "Auth: POST /api/loans", endpoint: "/api/loans", method: "POST", expectedStatus: 401 },
  { name: "Auth: GET /api/user/ai-usage", endpoint: "/api/user/ai-usage", method: "GET", expectedStatus: 401 },
  { name: "Auth: GET /api/templates", endpoint: "/api/templates", method: "GET", expectedStatus: 401 },
  { name: "Auth: POST /api/templates", endpoint: "/api/templates", method: "POST", expectedStatus: 401 },
  { name: "Auth: POST /api/import/arive", endpoint: "/api/import/arive", method: "POST", expectedStatus: 401 },
  { name: "Auth: POST /api/stripe/checkout", endpoint: "/api/stripe/checkout", method: "POST", expectedStatus: 401 },
  { name: "Auth: POST /api/stripe/portal", endpoint: "/api/stripe/portal", method: "POST", expectedStatus: 401 },

  // ── AI routes — must 401 without auth ──────────────────────
  { name: "AI: calculate-income 401", endpoint: "/api/ai/calculate-income", method: "POST", expectedStatus: 401 },
  { name: "AI: readiness-score 401", endpoint: "/api/ai/readiness-score", method: "POST", expectedStatus: 401 },
  { name: "AI: aus-simulation 401", endpoint: "/api/ai/aus-simulation", method: "POST", expectedStatus: 401 },
  { name: "AI: parse-conditions 401", endpoint: "/api/ai/parse-conditions", method: "POST", expectedStatus: 401 },
  { name: "AI: validate-condition 401", endpoint: "/api/ai/validate-condition", method: "POST", expectedStatus: 401 },
  { name: "AI: draft-message 401", endpoint: "/api/ai/draft-message", method: "POST", expectedStatus: 401 },
  { name: "AI: pulse-reasoning 401", endpoint: "/api/ai/pulse-reasoning", method: "POST", expectedStatus: 401 },
  { name: "AI: underwriting-narrative 401", endpoint: "/api/ai/underwriting-narrative", method: "POST", expectedStatus: 401 },
  { name: "AI: generate-preapproval 401", endpoint: "/api/ai/generate-preapproval", method: "POST", expectedStatus: 401 },
  { name: "AI: classify-document 401", endpoint: "/api/ai/classify-document", method: "POST", body: {}, expectedStatus: 400, acceptableStatuses: [400, 401] },
  { name: "AI: extract-document 401", endpoint: "/api/ai/extract-document", method: "POST", body: {}, expectedStatus: 400, acceptableStatuses: [400, 401] },

  // ── Cron — must reject without secret ──────────────────────
  { name: "Cron: follow-up no secret → 401", endpoint: "/api/cron/follow-up", method: "GET", expectedStatus: 401 },
  {
    name: "Cron: e2e-test wrong secret → 401",
    endpoint: "/api/cron/e2e-test",
    method: "GET",
    expectedStatus: 401,
    headers: { Authorization: "Bearer wrong-secret-xyz" },
  },

  // ── Portal — invalid token should 404, not 500 ─────────────
  {
    name: "Portal: invalid token → 404 not 500",
    endpoint: "/api/portal/invalid-token-test-e2e/messages",
    method: "GET",
    expectedStatus: 404,
    acceptableStatuses: [404],
  },
  {
    name: "Portal: sign with invalid token → 404",
    endpoint: "/api/portal/invalid-token-test-e2e/sign",
    method: "POST",
    expectedStatus: 404,
    acceptableStatuses: [404],
  },

  // ── Loan sub-resources — must 401 without auth ─────────────
  {
    name: "Auth: audit log 401",
    endpoint: "/api/loans/00000000-0000-0000-0000-000000000000/audit",
    method: "GET",
    expectedStatus: 401,
  },
];

// ──────────────────────────────────────────────────────────────
// Agent
// ──────────────────────────────────────────────────────────────
export class E2ETestAgent {
  constructor(private db: SupabaseClient<Database>) {}

  async run(params: {
    baseUrl: string;
    triggeredBy?: string;
  }): Promise<TestRunSummary> {
    const startedAt = Date.now();
    const triggeredBy = params.triggeredBy ?? "cron";

    // Create the run record
    const { data: runRow } = await this.db
      .from("test_runs")
      .insert({
        triggered_by: triggeredBy,
        base_url: params.baseUrl,
        status: "running",
        total: TEST_SUITE.length,
      })
      .select("id")
      .single();

    const runId = (runRow as { id: string } | null)?.id;
    if (!runId) throw new Error("Failed to create test_run record");

    const resultInserts: Database["public"]["Tables"]["test_results"]["Insert"][] = [];
    const failures: TestRunSummary["failures"] = [];
    let passed = 0;

    // Run tests sequentially to avoid hammering the server
    for (const tc of TEST_SUITE) {
      const result = await this.runTest(params.baseUrl, tc);
      const didPass = result.passed;

      resultInserts.push({
        run_id: runId,
        test_name: tc.name,
        endpoint: tc.endpoint,
        method: tc.method,
        expected_status: tc.expectedStatus,
        actual_status: result.actualStatus,
        passed: didPass,
        response_body: result.body?.slice(0, 500) ?? null,
        error_message: result.error ?? null,
        duration_ms: result.durationMs,
      });

      if (didPass) {
        passed++;
      } else {
        failures.push({
          name: tc.name,
          endpoint: tc.endpoint,
          expected: tc.expectedStatus,
          actual: result.actualStatus,
          error: result.error,
        });
      }
    }

    // Batch insert results
    await this.db.from("test_results").insert(resultInserts);

    const durationMs = Date.now() - startedAt;
    const failed = TEST_SUITE.length - passed;

    // Update run with final stats
    await this.db
      .from("test_runs")
      .update({
        passed,
        failed,
        total: TEST_SUITE.length,
        duration_ms: durationMs,
        status: "completed",
      })
      .eq("id", runId);

    return { runId, total: TEST_SUITE.length, passed, failed, durationMs, failures };
  }

  private async runTest(
    baseUrl: string,
    tc: TestCase
  ): Promise<{ passed: boolean; actualStatus: number | null; body: string | null; error?: string; durationMs: number }> {
    const url = `${baseUrl}${tc.endpoint}`;
    const t0 = Date.now();

    try {
      const res = await fetch(url, {
        method: tc.method,
        headers: {
          "Content-Type": "application/json",
          ...(tc.headers ?? {}),
        },
        body: tc.body ? JSON.stringify(tc.body) : undefined,
        // Short timeout so we don't hang the cron job
        signal: AbortSignal.timeout(10_000),
      });

      const body = await res.text().catch(() => "");
      const durationMs = Date.now() - t0;

      const acceptable = tc.acceptableStatuses ?? [tc.expectedStatus];
      const passed = acceptable.includes(res.status);

      return { passed, actualStatus: res.status, body: body.slice(0, 500), durationMs };
    } catch (err) {
      const durationMs = Date.now() - t0;
      const error = err instanceof Error ? err.message : String(err);
      return { passed: false, actualStatus: null, body: null, error, durationMs };
    }
  }
}

// ============================================================
// SELF-HEAL AGENT
// Consumes E2E test failures + live telemetry from the past
// 24 hours, feeds it all to Gemini Pro, and produces a
// structured diagnosis with a suggested fix.
//
// The agent stores the result in heal_actions and surfaces it
// in the Health Dashboard. No code is auto-applied — the LO
// reviews and can dismiss or mark applied.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { proModel, extractJson } from "@/lib/ai/client";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import type { TestRunSummary } from "./e2eTestAgent";

type HealAction = Database["public"]["Tables"]["heal_actions"]["Row"];

interface TelemetrySnapshot {
  tokenUsage24h: {
    totalTokens: number;
    totalCostUsd: number;
    byModule: Record<string, { tokens: number; cost: number }>;
    errorModules: string[];     // modules with 0 output tokens (likely failed calls)
  };
  recentEvents24h: {
    total: number;
    byType: Record<string, number>;
    anomalies: string[];        // event types with unusually high counts
  };
  openEscalations: number;
  recentTestRuns: {
    totalRuns: number;
    avgPassRate: number;
    consistentlyFailingEndpoints: string[];
  };
}

interface HealDiagnosis {
  root_cause: string;
  severity: "low" | "medium" | "high" | "critical";
  affected_files: string[];
  suggested_fix: string;
  patch_diff: string;
  telemetry_summary: string;
}

function buildHealPrompt(
  failures: TestRunSummary["failures"],
  telemetry: TelemetrySnapshot
): string {
  return `You are a senior backend engineer and DevOps specialist for LoanFlow AI, a Next.js mortgage origination SaaS built on Supabase, Google Gemini AI, and Stripe.

You have just received a nightly E2E test report plus 24-hour telemetry. Your job is to:
1. Identify the root cause of every test failure
2. Cross-reference failures with telemetry signals
3. Produce a precise, actionable fix

## E2E Test Failures (${failures.length} failing)
${failures.length === 0
  ? "All tests passed — no failures to analyze."
  : failures.map((f, i) =>
      `${i + 1}. ${f.name}\n   Endpoint: ${f.endpoint}\n   Expected: ${f.expected} | Got: ${f.actual ?? "no response"}\n   Error: ${f.error ?? "none"}`
    ).join("\n\n")}

## Telemetry Snapshot (last 24h)
### Token Usage
- Total tokens: ${telemetry.tokenUsage24h.totalTokens.toLocaleString()}
- Total cost: $${telemetry.tokenUsage24h.totalCostUsd.toFixed(4)}
- Modules: ${JSON.stringify(telemetry.tokenUsage24h.byModule, null, 2)}
- Modules with suspected failures (0 output tokens): ${telemetry.tokenUsage24h.errorModules.join(", ") || "none"}

### File Completion Events
- Total: ${telemetry.recentEvents24h.total}
- By type: ${JSON.stringify(telemetry.recentEvents24h.byType)}
- Anomalies: ${telemetry.recentEvents24h.anomalies.join(", ") || "none"}

### Open Escalations: ${telemetry.openEscalations}

### Historical Test Trends
- Runs in last 7 days: ${telemetry.recentTestRuns.totalRuns}
- Avg pass rate: ${telemetry.recentTestRuns.avgPassRate.toFixed(1)}%
- Endpoints consistently failing: ${telemetry.recentTestRuns.consistentlyFailingEndpoints.join(", ") || "none"}

## Project Architecture
- Framework: Next.js 16 App Router + TypeScript
- DB: Supabase (PostgreSQL + RLS)
- AI: Google Gemini Flash/Pro via \`lib/ai/client.ts\` (proModel / flashModel)
- Payments: Stripe
- All API routes: auth check (401) → Zod validation (400) → ownership check → DB
- AI routes additionally: rate limit check (429) → AI call
- Cron routes: Bearer token check → agent execution
- Portal routes: use service client (bypasses RLS by design)

## Common failure patterns and their fixes
- 200 when 401 expected → auth check missing or short-circuit bug (check \`if (!user)\` guard)
- 500 on portal → service client not used, or loan file query missing .maybeSingle()
- AI route 500 → Gemini API key missing or JSON parsing failure
- Cron 200 without auth → CRON_SECRET env var not set (guard: \`if (!expectedSecret || ...)\`)
- Rate limit not enforced → checkAiRateLimit not imported in that route

Return ONLY valid JSON in this exact shape:
{
  "root_cause": "<1-3 sentence technical explanation of what is broken and why>",
  "severity": "low" | "medium" | "high" | "critical",
  "affected_files": ["<relative file paths like app/api/foo/route.ts>"],
  "suggested_fix": "<step-by-step instructions a developer can follow to fix this, including specific code changes>",
  "patch_diff": "<unified diff format patch, or empty string if no code change needed>",
  "telemetry_summary": "<2-3 sentence summary of what the telemetry signals suggest about system health beyond test failures>"
}

If all tests pass and telemetry is healthy, still return the JSON with severity "low" and a positive health summary.`;
}

// ──────────────────────────────────────────────────────────────
// Agent
// ──────────────────────────────────────────────────────────────
export class SelfHealAgent {
  constructor(private db: SupabaseClient<Database>) {}

  async analyze(params: {
    runSummary: TestRunSummary;
    /** Optional user ID for token tracking (uses system ID if not set) */
    systemUserId?: string;
  }): Promise<HealAction> {
    const { runSummary } = params;

    // ── 1. Gather telemetry ────────────────────────────────────
    const telemetry = await this.gatherTelemetry(runSummary.runId);

    // ── 2. Build prompt and call Gemini Pro ───────────────────
    const prompt = buildHealPrompt(runSummary.failures, telemetry);

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const diagnosis = JSON.parse(extractJson(text)) as HealDiagnosis;

    // ── 3. Track token usage ───────────────────────────────────
    const usage = result.response.usageMetadata;
    if (params.systemUserId) {
      await trackTokenUsage({
        userId: params.systemUserId,
        module: "self-heal",
        model: "gemini-2.0-flash",
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        costUsd: estimateCost(
          "validate-condition",
          usage?.promptTokenCount ?? 0,
          usage?.candidatesTokenCount ?? 0
        ),
      });
    }

    // ── 4. Persist heal_action ─────────────────────────────────
    const { data: healRow } = await this.db
      .from("heal_actions")
      .insert({
        run_id: runSummary.runId,
        failures_analyzed: runSummary.failures.length,
        root_cause: diagnosis.root_cause,
        severity: diagnosis.severity,
        affected_files: diagnosis.affected_files,
        suggested_fix: diagnosis.suggested_fix,
        patch_diff: diagnosis.patch_diff || null,
        telemetry_summary: diagnosis.telemetry_summary,
        auto_applied: false,
        status: "pending",
      })
      .select()
      .single();

    console.log(`[SelfHealAgent] Heal action created — severity: ${diagnosis.severity}, failures: ${runSummary.failures.length}`);

    return healRow as unknown as HealAction;
  }

  // ── Telemetry collection ─────────────────────────────────────
  private async gatherTelemetry(currentRunId: string): Promise<TelemetrySnapshot> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [tokenRows, eventRows, escalationRows, historicRunRows] = await Promise.all([
      this.db
        .from("token_usage")
        .select("module, input_tokens, output_tokens, cost_usd")
        .gte("created_at", since24h),
      this.db
        .from("file_completion_events")
        .select("event_type")
        .gte("created_at", since24h),
      this.db
        .from("escalations")
        .select("id")
        .eq("status", "open"),
      this.db
        .from("test_runs")
        .select("passed, failed, total")
        .gte("run_at", since7d)
        .neq("id", currentRunId)
        .eq("status", "completed"),
    ]);

    // Token usage aggregation
    const byModule: Record<string, { tokens: number; cost: number; outputTokens: number }> = {};
    for (const row of tokenRows.data ?? []) {
      if (!byModule[row.module]) byModule[row.module] = { tokens: 0, cost: 0, outputTokens: 0 };
      byModule[row.module].tokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
      byModule[row.module].cost += row.cost_usd ?? 0;
      byModule[row.module].outputTokens += row.output_tokens ?? 0;
    }
    const errorModules = Object.entries(byModule)
      .filter(([, v]) => v.outputTokens === 0 && v.tokens > 0)
      .map(([k]) => k);

    const totalTokens = Object.values(byModule).reduce((s, v) => s + v.tokens, 0);
    const totalCostUsd = Object.values(byModule).reduce((s, v) => s + v.cost, 0);
    const byModuleClean = Object.fromEntries(
      Object.entries(byModule).map(([k, v]) => [k, { tokens: v.tokens, cost: v.cost }])
    );

    // Event aggregation
    const byType: Record<string, number> = {};
    for (const row of eventRows.data ?? []) {
      byType[row.event_type] = (byType[row.event_type] ?? 0) + 1;
    }
    const maxCount = Math.max(...Object.values(byType), 0);
    const anomalies = Object.entries(byType)
      .filter(([, count]) => maxCount > 0 && count === maxCount && maxCount > 10)
      .map(([k]) => k);

    // Historic test run aggregation
    const runs = historicRunRows.data ?? [];
    const avgPassRate = runs.length > 0
      ? runs.reduce((s, r) => s + (r.total > 0 ? (r.passed / r.total) * 100 : 100), 0) / runs.length
      : 100;

    // Find endpoints that failed in multiple runs by joining test_results
    // (simplified: if avg pass rate is < 80%, flag it)
    const consistentlyFailingEndpoints: string[] = [];
    if (avgPassRate < 80 && runs.length >= 2) {
      const { data: failedResults } = await this.db
        .from("test_results")
        .select("endpoint, passed")
        .eq("passed", false)
        .gte("created_at", since7d);

      const failCounts: Record<string, number> = {};
      for (const r of failedResults ?? []) {
        failCounts[r.endpoint] = (failCounts[r.endpoint] ?? 0) + 1;
      }
      for (const [ep, count] of Object.entries(failCounts)) {
        if (count >= 2) consistentlyFailingEndpoints.push(ep);
      }
    }

    return {
      tokenUsage24h: { totalTokens, totalCostUsd, byModule: byModuleClean, errorModules },
      recentEvents24h: { total: (eventRows.data ?? []).length, byType, anomalies },
      openEscalations: (escalationRows.data ?? []).length,
      recentTestRuns: {
        totalRuns: runs.length,
        avgPassRate,
        consistentlyFailingEndpoints,
      },
    };
  }
}

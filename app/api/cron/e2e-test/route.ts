// ============================================================
// CRON — Nightly E2E Test + Self-Heal
// Schedule: 0 0 * * * (midnight UTC)
// Secured with CRON_SECRET bearer token.
//
// Flow:
//   1. E2ETestAgent runs full test suite against live app
//   2. SelfHealAgent ingests failures + telemetry → AI diagnosis
//   3. Results stored in test_runs / test_results / heal_actions
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { E2ETestAgent } from "@/lib/agents/e2eTestAgent";
import { SelfHealAgent } from "@/lib/agents/selfHealAgent";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = env.cronSecret;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggered = request.nextUrl.searchParams.get("triggered_by") ?? "cron";
  // In dev, always test localhost. In production, use NEXT_PUBLIC_APP_URL.
  const baseUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : env.appUrl;

  try {
    const db = await createServiceClient();

    // ── 1. Run E2E test suite ──────────────────────────────────
    console.log(`[cron/e2e-test] Starting E2E suite against ${baseUrl}`);
    const testAgent = new E2ETestAgent(db);
    const runSummary = await testAgent.run({ baseUrl, triggeredBy: triggered });

    console.log(
      `[cron/e2e-test] Suite complete — ${runSummary.passed}/${runSummary.total} passed (${runSummary.durationMs}ms)`
    );

    // ── 2. Self-heal analysis (non-fatal — test results are kept even if AI fails) ──
    let heal: { id?: string; severity?: string | null; rootCause?: string | null; error?: string } = {};
    try {
      console.log("[cron/e2e-test] Running self-heal analysis...");
      const healAgent = new SelfHealAgent(db);
      const healAction = await healAgent.analyze({ runSummary });
      heal = { id: healAction.id, severity: healAction.severity, rootCause: healAction.root_cause };
      console.log(`[cron/e2e-test] Heal action stored — severity: ${healAction.severity}, id: ${healAction.id}`);
    } catch (healErr) {
      const msg = healErr instanceof Error ? healErr.message : String(healErr);
      const is429 = msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests");
      heal = { error: is429 ? "AI quota exceeded — heal skipped, test results saved" : msg };
      console.warn("[cron/e2e-test] Heal agent failed (non-fatal):", msg.slice(0, 200));
    }

    return NextResponse.json({
      success: true,
      runId: runSummary.runId,
      summary: {
        total: runSummary.total,
        passed: runSummary.passed,
        failed: runSummary.failed,
        durationMs: runSummary.durationMs,
        passRate: `${((runSummary.passed / runSummary.total) * 100).toFixed(1)}%`,
      },
      heal,
    });
  } catch (err) {
    console.error("[cron/e2e-test] Fatal error:", err);
    return NextResponse.json({ error: "E2E cron failed", detail: String(err) }, { status: 500 });
  }
}

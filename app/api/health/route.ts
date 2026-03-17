// ============================================================
// GET /api/health
// Returns recent test runs + heal actions for the dashboard.
// Authenticated — only the LO can see their app's health.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const serviceDb = await createServiceClient();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const runId = request.nextUrl.searchParams.get("runId");

  // Fetch recent test runs
  const { data: runs } = await serviceDb
    .from("test_runs")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(limit);

  // Fetch heal actions for those runs
  type RunRow = Database["public"]["Tables"]["test_runs"]["Row"];
  const runIds = ((runs ?? []) as unknown as RunRow[]).map((r) => r.id);
  const { data: healActions } = runIds.length > 0
    ? await serviceDb
        .from("heal_actions")
        .select("*")
        .in("run_id", runIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // If a specific runId is requested, also fetch its individual test results
  let testResults = null;
  if (runId) {
    const { data } = await serviceDb
      .from("test_results")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });
    testResults = data;
  }

  return NextResponse.json(successResponse({
    runs: runs ?? [],
    healActions: healActions ?? [],
    testResults,
  }));
}

// ── POST /api/health/trigger — manual run from dashboard ────
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(errorResponse("CRON_SECRET not configured"), { status: 500 });
  }

  const appUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const res = await fetch(`${appUrl}/api/cron/e2e-test?triggered_by=manual`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface TestRun {
  id: string;
  run_at: string;
  total: number;
  passed: number;
  failed: number;
  duration_ms: number | null;
  triggered_by: string;
  status: string;
}

interface HealAction {
  id: string;
  run_id: string | null;
  created_at: string;
  failures_analyzed: number;
  root_cause: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  suggested_fix: string | null;
  affected_files: string[] | null;
  patch_diff: string | null;
  telemetry_summary: string | null;
  status: "pending" | "applied" | "dismissed";
}

interface TestResult {
  id: string;
  test_name: string;
  endpoint: string;
  method: string;
  expected_status: number;
  actual_status: number | null;
  passed: boolean;
  response_body: string | null;
  error_message: string | null;
  duration_ms: number | null;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const severityColor: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

function passRateColor(rate: number) {
  if (rate === 100) return "text-green-600";
  if (rate >= 90) return "text-yellow-600";
  return "text-red-600";
}

function fmtDuration(ms: number | null) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────
export default function HealthPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [healActions, setHealActions] = useState<HealAction[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [expandedHeal, setExpandedHeal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/health");
    if (res.ok) {
      const json = await res.json();
      setRuns(json.data?.runs ?? []);
      setHealActions(json.data?.healActions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadRunResults = async (run: TestRun) => {
    setSelectedRun(run);
    setTestResults(null);
    const res = await fetch(`/api/health?runId=${run.id}`);
    if (res.ok) {
      const json = await res.json();
      setTestResults(json.data?.testResults ?? []);
    }
  };

  const triggerRun = async () => {
    setIsTriggering(true);
    setTriggerMsg(null);
    const res = await fetch("/api/health", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setTriggerMsg(`Run complete — ${json.summary?.passed}/${json.summary?.total} passed`);
      await loadData();
    } else {
      setTriggerMsg(json.error ?? "Failed to trigger run");
    }
    setIsTriggering(false);
  };

  const dismissHeal = async (id: string) => {
    await fetch(`/api/health/heal/${id}`, { method: "PATCH", body: JSON.stringify({ status: "dismissed" }), headers: { "Content-Type": "application/json" } });
    setHealActions((prev) => prev.map((h) => h.id === id ? { ...h, status: "dismissed" } : h));
  };

  const markApplied = async (id: string) => {
    await fetch(`/api/health/heal/${id}`, { method: "PATCH", body: JSON.stringify({ status: "applied" }), headers: { "Content-Type": "application/json" } });
    setHealActions((prev) => prev.map((h) => h.id === id ? { ...h, status: "applied" } : h));
  };

  const latestRun = runs[0];
  const passRate = latestRun ? Math.round((latestRun.passed / latestRun.total) * 100) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">E2E test results and AI self-heal diagnostics</p>
        </div>
        <Button onClick={triggerRun} disabled={isTriggering}>
          {isTriggering ? "Running..." : "Run Tests Now"}
        </Button>
      </div>

      {triggerMsg && (
        <p className="text-sm font-medium text-muted-foreground">{triggerMsg}</p>
      )}

      {/* ── Latest status banner ─────────────────────────────── */}
      {latestRun && passRate !== null && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={`text-3xl font-bold ${passRateColor(passRate)}`}>{passRate}%</p>
                <p className="text-sm text-muted-foreground">
                  {latestRun.passed}/{latestRun.total} tests passing
                  {" · "}{fmtDuration(latestRun.duration_ms)}
                  {" · "}{new Date(latestRun.run_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{latestRun.triggered_by}</Badge>
            </div>
            <Progress value={passRate} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Test runs list ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Test Runs</CardTitle>
            <CardDescription>Click a run to see individual results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loading && runs.length === 0 && (
              <p className="text-sm text-muted-foreground">No runs yet — click "Run Tests Now" to start.</p>
            )}
            {runs.map((run) => {
              const rate = Math.round((run.passed / run.total) * 100);
              const isSelected = selectedRun?.id === run.id;
              return (
                <button
                  key={run.id}
                  onClick={() => loadRunResults(run)}
                  className={`w-full text-left rounded-md border p-3 transition-colors hover:bg-muted/50 ${isSelected ? "border-primary bg-muted/50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium text-sm ${passRateColor(rate)}`}>{rate}% pass</span>
                    <span className="text-xs text-muted-foreground">{fmtDuration(run.duration_ms)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {run.passed}/{run.total} · {new Date(run.run_at).toLocaleString()} · {run.triggered_by}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Individual test results ─────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedRun ? "Test Results" : "Select a Run"}</CardTitle>
            {selectedRun && (
              <CardDescription>
                {new Date(selectedRun.run_at).toLocaleString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {!selectedRun && (
              <p className="text-sm text-muted-foreground">Select a test run from the left.</p>
            )}
            {selectedRun && testResults === null && (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
            {testResults?.map((tr) => (
              <div
                key={tr.id}
                className={`flex items-start justify-between py-1.5 border-b last:border-0 ${tr.passed ? "" : "text-red-600"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{tr.test_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{tr.method} {tr.endpoint}</p>
                  {!tr.passed && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Expected {tr.expected_status}, got {tr.actual_status ?? "no response"}
                      {tr.error_message ? ` — ${tr.error_message}` : ""}
                    </p>
                  )}
                </div>
                <Badge
                  variant={tr.passed ? "outline" : "destructive"}
                  className="ml-2 shrink-0 text-xs"
                >
                  {tr.passed ? "PASS" : "FAIL"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Heal actions ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>AI Heal Diagnostics</CardTitle>
          <CardDescription>
            Gemini Pro analysis of failures + 24h telemetry — review and apply fixes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {healActions.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No diagnostics yet.</p>
          )}
          {healActions.map((h) => (
            <div key={h.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`capitalize ${severityColor[h.severity ?? "low"]}`}>
                    {h.severity ?? "low"}
                  </Badge>
                  <Badge variant={h.status === "applied" ? "outline" : h.status === "dismissed" ? "secondary" : "default"}>
                    {h.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {h.failures_analyzed} failure{h.failures_analyzed !== 1 ? "s" : ""} analyzed
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                </span>
              </div>

              {h.root_cause && (
                <p className="text-sm font-medium">{h.root_cause}</p>
              )}

              {h.telemetry_summary && (
                <p className="text-xs text-muted-foreground">{h.telemetry_summary}</p>
              )}

              {h.affected_files && h.affected_files.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {h.affected_files.map((f) => (
                    <code key={f} className="text-xs bg-muted px-1.5 py-0.5 rounded">{f}</code>
                  ))}
                </div>
              )}

              <button
                onClick={() => setExpandedHeal(expandedHeal === h.id ? null : h.id)}
                className="text-xs text-primary underline"
              >
                {expandedHeal === h.id ? "Hide details" : "Show suggested fix"}
              </button>

              {expandedHeal === h.id && h.suggested_fix && (
                <div className="space-y-2">
                  <Separator />
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Suggested Fix</p>
                  <pre className="text-xs bg-muted rounded p-3 whitespace-pre-wrap overflow-x-auto max-h-64">
                    {h.suggested_fix}
                  </pre>
                  {h.patch_diff && (
                    <>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Patch Diff</p>
                      <pre className="text-xs bg-muted rounded p-3 whitespace-pre-wrap overflow-x-auto max-h-64 font-mono">
                        {h.patch_diff}
                      </pre>
                    </>
                  )}
                </div>
              )}

              {h.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => markApplied(h.id)}>
                    Mark Applied
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismissHeal(h.id)}>
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

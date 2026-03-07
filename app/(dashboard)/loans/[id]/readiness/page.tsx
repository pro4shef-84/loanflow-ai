"use client";

import { use, useState } from "react";
import { useLoan } from "@/hooks/useLoans";
import { useDocuments } from "@/hooks/useDocuments";
import { ReadinessScore } from "@/components/loans/ReadinessScore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReadinessScore as ReadinessScoreType } from "@/lib/types/loan.types";
import { useQueryClient } from "@tanstack/react-query";

export default function ReadinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);
  const { data: documents } = useDocuments(id);
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/readiness-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanFileId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to calculate");
      queryClient.invalidateQueries({ queryKey: ["loans", id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setIsCalculating(false);
    }
  };

  const readiness = loan?.readiness_breakdown as ReadinessScoreType | null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Readiness Score</h1>
            <p className="text-muted-foreground text-sm">Submission readiness analysis</p>
          </div>
        </div>
        <Button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="gap-2"
        >
          {isCalculating ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Calculating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> {readiness ? "Recalculate" : "Calculate Score"}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {isCalculating ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
      ) : readiness && loan != null && loan.submission_readiness_score !== null ? (
        <Card>
          <CardContent className="pt-6">
            <ReadinessScore score={{ ...readiness, score: loan.submission_readiness_score! }} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Score Yet</CardTitle>
            <CardDescription>
              Click &quot;Calculate Score&quot; to run an AI analysis of this loan file&apos;s submission readiness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>The readiness score analyzes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Documents — all required docs present and verified (30 pts)</li>
                <li>Income — qualifying income calculated, no red flags (30 pts)</li>
                <li>Assets — sufficient for down payment and reserves (20 pts)</li>
                <li>Application — complete 1003, no inconsistencies (20 pts)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

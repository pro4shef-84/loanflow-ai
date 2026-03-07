"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ReadinessScore as ReadinessScoreType } from "@/lib/types/loan.types";
import { cn } from "@/lib/utils";

interface ReadinessScoreProps {
  score: ReadinessScoreType;
  compact?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 bg-green-50 border-green-200",
  B: "text-blue-600 bg-blue-50 border-blue-200",
  C: "text-orange-600 bg-orange-50 border-orange-200",
  F: "text-red-600 bg-red-50 border-red-200",
};

export function ReadinessScore({ score, compact = false }: ReadinessScoreProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("font-bold text-lg px-3 py-1", GRADE_COLORS[score.grade])}>
          {score.grade}
        </Badge>
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Readiness</span>
            <span className="font-medium">{score.score}/100</span>
          </div>
          <Progress value={score.score} className="h-2" />
        </div>
      </div>
    );
  }

  const categories = [
    { key: "documents", label: "Documents", data: score.breakdown.documents },
    { key: "income", label: "Income", data: score.breakdown.income },
    { key: "assets", label: "Assets", data: score.breakdown.assets },
    { key: "application", label: "Application", data: score.breakdown.application },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className={cn("flex items-center justify-center h-16 w-16 rounded-full border-2 font-bold text-2xl", GRADE_COLORS[score.grade])}>
          {score.grade}
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Overall Readiness</span>
            <span className="font-bold">{score.score}/100</span>
          </div>
          <Progress value={score.score} className="h-3" />
          {score.ready_to_submit && (
            <p className="text-sm text-green-600 mt-1 font-medium">Ready to submit to underwriting</p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {categories.map(({ label, data }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">{data.score}/{data.max}</span>
            </div>
            <Progress value={(data.score / data.max) * 100} className="h-2" />
            {data.issues.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {data.issues.map((issue, i) => (
                  <li key={i} className={cn("text-xs", issue.severity === "blocker" ? "text-red-600" : "text-orange-600")}>
                    {issue.severity === "blocker" ? "✗" : "⚠"} {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

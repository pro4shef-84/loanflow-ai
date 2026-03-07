"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date-utils";

type Condition = Database["public"]["Tables"]["conditions"]["Row"];

const STATUS_COLORS: Record<Condition["status"], string> = {
  open: "bg-red-50 text-red-700 border-red-200",
  borrower_notified: "bg-yellow-50 text-yellow-700 border-yellow-200",
  document_received: "bg-blue-50 text-blue-700 border-blue-200",
  validated: "bg-purple-50 text-purple-700 border-purple-200",
  submitted_to_lender: "bg-indigo-50 text-indigo-700 border-indigo-200",
  cleared: "bg-green-50 text-green-700 border-green-200",
  waived: "bg-slate-50 text-slate-700 border-slate-200",
};

const PRIORITY_COLORS = {
  high: "text-red-600",
  normal: "text-foreground",
  low: "text-muted-foreground",
};

interface ConditionCardProps {
  condition: Condition;
  onStatusChange?: (id: string, status: Condition["status"]) => void;
}

export function ConditionCard({ condition, onStatusChange }: ConditionCardProps) {
  return (
    <Card className={cn("border-l-4", condition.priority === "high" ? "border-l-red-400" : condition.priority === "low" ? "border-l-slate-300" : "border-l-blue-400")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={cn("text-sm font-medium", PRIORITY_COLORS[condition.priority ?? "normal"])}>
              {condition.plain_english_summary ?? condition.lender_condition_text}
            </p>
            {condition.plain_english_summary && condition.lender_condition_text && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {condition.lender_condition_text}
              </p>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0", STATUS_COLORS[condition.status])}>
            {condition.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="capitalize">{condition.source}</span>
            {condition.due_date && <span>Due: {formatDate(condition.due_date)}</span>}
            {condition.required_document_type && (
              <span className="capitalize">{condition.required_document_type.replace(/_/g, " ")}</span>
            )}
          </div>

          {onStatusChange && condition.status !== "cleared" && condition.status !== "waived" && (
            <div className="flex gap-1">
              {condition.status === "open" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onStatusChange(condition.id, "borrower_notified")}
                >
                  Notify Borrower
                </Button>
              )}
              {condition.status === "document_received" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onStatusChange(condition.id, "validated")}
                >
                  Mark Validated
                </Button>
              )}
              {condition.status === "validated" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onStatusChange(condition.id, "cleared")}
                >
                  Mark Cleared
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

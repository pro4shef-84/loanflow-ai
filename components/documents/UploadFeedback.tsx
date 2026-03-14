"use client";

import {
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { DOC_TYPE_LABELS } from "@/lib/domain";
import type { RequiredDocType } from "@/lib/domain";

export type UploadFeedbackStatus = "success" | "issues" | "needs_review" | "error";

interface UploadFeedbackProps {
  status: UploadFeedbackStatus;
  /** Document classification type, if available. */
  classifiedType?: RequiredDocType;
  /** Confidence score 0-1 */
  confidenceScore?: number;
  /** List of issues found during validation. */
  issues?: string[];
  /** Error message, when status is "error". */
  errorMessage?: string;
  /** Retry callback for error state. */
  onRetry?: () => void;
  /** Dismiss callback. */
  onDismiss?: () => void;
}

const STATUS_CONFIG: Record<
  UploadFeedbackStatus,
  { icon: typeof CheckCircle; bgClass: string; textClass: string; borderClass: string }
> = {
  success: {
    icon: CheckCircle,
    bgClass: "bg-green-50",
    textClass: "text-green-700",
    borderClass: "border-green-200",
  },
  issues: {
    icon: AlertTriangle,
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
  },
  needs_review: {
    icon: Info,
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
  },
  error: {
    icon: XCircle,
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
  },
};

const STATUS_TITLES: Record<UploadFeedbackStatus, string> = {
  success: "Document Accepted",
  issues: "Issues Found",
  needs_review: "Under Review",
  error: "Upload Failed",
};

const STATUS_DESCRIPTIONS: Record<UploadFeedbackStatus, string> = {
  success: "Your document has been received and validated successfully.",
  issues: "We found some issues that need attention.",
  needs_review: "Under review by your loan officer.",
  error: "Something went wrong. Please try again.",
};

export function UploadFeedback({
  status,
  classifiedType,
  confidenceScore,
  issues,
  errorMessage,
  onRetry,
  onDismiss,
}: UploadFeedbackProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        config.bgClass,
        config.borderClass
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-6 w-6 shrink-0", config.textClass)} />
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-sm", config.textClass)}>
            {STATUS_TITLES[status]}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {status === "error" && errorMessage ? errorMessage : STATUS_DESCRIPTIONS[status]}
          </p>
        </div>
      </div>

      {classifiedType && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Classified as:</span>
          <span className="font-medium">
            {DOC_TYPE_LABELS[classifiedType] ?? classifiedType.replace(/_/g, " ")}
          </span>
        </div>
      )}

      {confidenceScore !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{Math.round(confidenceScore * 100)}%</span>
          </div>
          <Progress
            value={confidenceScore * 100}
            className={cn(
              "h-1.5",
              confidenceScore >= 0.75 ? "[&>div]:bg-green-500" : confidenceScore >= 0.5 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
            )}
          />
        </div>
      )}

      {issues && issues.length > 0 && (
        <ul className="space-y-1">
          {issues.map((issue, idx) => (
            <li key={idx} className="text-sm flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              {issue}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        {status === "error" && onRetry && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

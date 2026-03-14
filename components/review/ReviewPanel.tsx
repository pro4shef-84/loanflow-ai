"use client";

import { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Archive,
  Loader2,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DocWorkflowBadge, RequirementStateBadge } from "@/components/ui/status-badge";
import { useReviewSummary, useSubmitReview } from "@/hooks/useReview";
import type { DocWorkflowState, DocumentRequirementState, RequiredDocType } from "@/lib/domain";
import { DOC_TYPE_LABELS, REQUIREMENT_STATE_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface ReviewPanelProps {
  loanFileId: string;
}

type ReviewAction = "review_ready" | "needs_correction" | "archived";

export function ReviewPanel({ loanFileId }: ReviewPanelProps) {
  const { data: summary, isLoading, isError } = useReviewSummary(loanFileId);
  const submitReview = useSubmitReview(loanFileId);

  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmAction, setConfirmAction] = useState<ReviewAction | null>(null);

  const handleSubmit = async () => {
    if (!confirmAction) return;
    await submitReview.mutateAsync({
      decision: confirmAction,
      notes: reviewNotes,
    });
    setConfirmAction(null);
    setReviewNotes("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Review summary not available. Generate a checklist first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const actionButtons: Array<{
    action: ReviewAction;
    label: string;
    icon: typeof CheckCircle;
    variant: "default" | "outline" | "destructive";
  }> = [
    { action: "review_ready", label: "Mark Review Ready", icon: CheckCircle, variant: "default" },
    { action: "needs_correction", label: "Request Correction", icon: AlertTriangle, variant: "outline" },
    { action: "archived", label: "Archive", icon: Archive, variant: "outline" },
  ];

  const actionLabels: Record<ReviewAction, string> = {
    review_ready: "Mark Review Ready",
    needs_correction: "Request Correction",
    archived: "Archive",
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Officer Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* AI Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">AI Summary</span>
              <DocWorkflowBadge state={summary.overall_status as DocWorkflowState} />
            </div>

            {summary.unresolved_issues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Unresolved Issues</p>
                <ul className="space-y-1">
                  {summary.unresolved_issues.map((issue, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.confidence_flags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Confidence Flags</p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.confidence_flags.map((flag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {summary.recommended_actions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Actions</p>
                <ul className="space-y-1">
                  {summary.recommended_actions.map((action, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Document Summary Cards */}
          {summary.document_summaries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Document Summary</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {summary.document_summaries.map((docSummary, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md border text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">
                        {DOC_TYPE_LABELS[docSummary.doc_type as RequiredDocType] ??
                          docSummary.doc_type.replace(/_/g, " ")}
                      </span>
                      <RequirementStateBadge
                        state={docSummary.state as DocumentRequirementState}
                      />
                    </div>
                    {docSummary.issues.length > 0 && (
                      <ul className="space-y-0.5">
                        {docSummary.issues.map((iss, i) => (
                          <li key={i} className="text-xs text-orange-600">{iss}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Notes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Review Notes</p>
            <Textarea
              placeholder="Add notes for your review decision..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {actionButtons.map(({ action, label, icon: Icon, variant }) => (
              <Button
                key={action}
                variant={variant}
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmAction(action)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Review Decision</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmAction ? actionLabels[confirmAction].toLowerCase() : ""}?
            </DialogDescription>
          </DialogHeader>
          {reviewNotes && (
            <div className="text-sm bg-slate-50 rounded-md p-3 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your Notes:</p>
              <p>{reviewNotes}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitReview.isPending}
            >
              {submitReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

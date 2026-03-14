"use client";

import { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Shield,
  ShieldOff,
  Upload,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirementStateBadge } from "@/components/ui/status-badge";
import { useChecklist, useGenerateChecklist, useWaiveRequirement } from "@/hooks/useChecklist";
import { useDocuments } from "@/hooks/useDocuments";
import type { TypedDocumentRequirement } from "@/hooks/useChecklist";
import type { DocumentRequirementState } from "@/lib/domain";
import { DOC_TYPE_LABELS } from "@/lib/domain";
import type { RequiredDocType } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface FileCompletionChecklistProps {
  loanFileId: string;
  onUpload?: (requirementId: string, docType: string) => void;
}

function stateIcon(state: DocumentRequirementState) {
  switch (state) {
    case "confirmed_by_officer":
    case "tentatively_satisfied":
      return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    case "waived_by_officer":
      return <ShieldOff className="h-4 w-4 text-gray-400 shrink-0" />;
    case "correction_required":
      return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
    case "uploaded_pending_validation":
      return <Loader2 className="h-4 w-4 text-blue-500 shrink-0 animate-spin" />;
    case "needs_officer_review":
      return <Shield className="h-4 w-4 text-purple-500 shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function isSatisfied(state: DocumentRequirementState): boolean {
  return state === "confirmed_by_officer" || state === "tentatively_satisfied" || state === "waived_by_officer";
}

export function FileCompletionChecklist({ loanFileId, onUpload }: FileCompletionChecklistProps) {
  const { data: requirements, isLoading } = useChecklist(loanFileId);
  const { data: documents } = useDocuments(loanFileId);
  const generateChecklist = useGenerateChecklist(loanFileId);
  const waiveRequirement = useWaiveRequirement(loanFileId);
  const [waivingId, setWaivingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-2 w-full" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!requirements || requirements.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            No document checklist generated yet.
          </p>
          <Button
            onClick={() => generateChecklist.mutate()}
            disabled={generateChecklist.isPending}
          >
            {generateChecklist.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ListChecks className="h-4 w-4 mr-2" />
                Generate Checklist
              </>
            )}
          </Button>
          {generateChecklist.isError && (
            <p className="text-sm text-destructive mt-2">
              {generateChecklist.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const satisfiedCount = requirements.filter((r) => isSatisfied(r.state)).length;
  const total = requirements.length;
  const progress = total > 0 ? (satisfiedCount / total) * 100 : 0;

  const handleWaive = async (req: TypedDocumentRequirement) => {
    setWaivingId(req.id);
    try {
      await waiveRequirement.mutateAsync({ requirementId: req.id });
    } finally {
      setWaivingId(null);
    }
  };

  /** Find uploaded doc matching this requirement's doc_type. */
  const getLinkedDocument = (req: TypedDocumentRequirement) => {
    return documents?.find(
      (d) => d.requirement_id === req.id || d.type === req.doc_type
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Document Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">File Completion</span>
            <span className="text-muted-foreground">
              {satisfiedCount}/{total} ({Math.round(progress)}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Requirements list */}
        <div className="space-y-2">
          {requirements.map((req) => {
            const doc = getLinkedDocument(req);
            const docLabel =
              DOC_TYPE_LABELS[req.doc_type] ?? req.doc_type.replace(/_/g, " ");
            const satisfied = isSatisfied(req.state);

            return (
              <div
                key={req.id}
                className={cn(
                  "flex items-start justify-between gap-3 p-3 rounded-lg border",
                  satisfied ? "border-green-200 bg-green-50/50" : "border-border"
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {stateIcon(req.state)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{docLabel}</p>
                      <RequirementStateBadge state={req.state} />
                    </div>
                    {doc && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {doc.original_filename ?? "Uploaded file"}
                      </p>
                    )}
                    {doc?.confidence_score !== null && doc?.confidence_score !== undefined && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              doc.confidence_score >= 0.75
                                ? "bg-green-500"
                                : doc.confidence_score >= 0.5
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            )}
                            style={{ width: `${doc.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(doc.confidence_score * 100)}%
                        </span>
                      </div>
                    )}
                    {doc?.issues && Array.isArray(doc.issues) && (doc.issues as string[]).length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {(doc.issues as string[]).map((issue, idx) => (
                          <li key={idx} className="text-xs text-orange-600 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    )}
                    {req.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{req.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!satisfied && onUpload && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => onUpload(req.id, req.doc_type)}
                    >
                      <Upload className="h-3 w-3" />
                      Upload
                    </Button>
                  )}
                  {!satisfied && req.state !== "uploaded_pending_validation" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      disabled={waivingId === req.id}
                      onClick={() => handleWaive(req)}
                    >
                      {waivingId === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Waive"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

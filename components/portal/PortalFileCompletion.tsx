"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Loader2,
  Upload,
  ShieldOff,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PortalUploader } from "@/components/portal/PortalUploader";
import { UploadFeedback } from "@/components/documents/UploadFeedback";
import type { UploadFeedbackStatus } from "@/components/documents/UploadFeedback";
import type { DocumentRequirementState, RequiredDocType } from "@/lib/domain";
import { DOC_TYPE_LABELS, REQUIREMENT_STATE_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface Requirement {
  id: string;
  doc_type: string;
  state: string;
  notes: string | null;
}

interface DocumentInfo {
  id: string;
  type: string;
  status: string;
  original_filename: string | null;
  confidence_score: number | null;
  issues: string[] | null;
  requirement_id: string | null;
}

interface PortalFileCompletionProps {
  loanToken: string;
  requirements: Requirement[];
  documents: DocumentInfo[];
}

function stateIcon(state: string) {
  switch (state) {
    case "confirmed_by_officer":
    case "tentatively_satisfied":
      return <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />;
    case "waived_by_officer":
      return <ShieldOff className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />;
    case "correction_required":
      return <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />;
    case "uploaded_pending_validation":
      return <Loader2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5 animate-spin" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
  }
}

function isSatisfied(state: string): boolean {
  return (
    state === "confirmed_by_officer" ||
    state === "tentatively_satisfied" ||
    state === "waived_by_officer"
  );
}

function needsUpload(state: string): boolean {
  return state === "required" || state === "awaiting_upload" || state === "correction_required";
}

export function PortalFileCompletion({
  loanToken,
  requirements,
  documents,
}: PortalFileCompletionProps) {
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    reqId: string;
    status: UploadFeedbackStatus;
    docType?: RequiredDocType;
    confidence?: number;
    issues?: string[];
  } | null>(null);

  const satisfiedCount = requirements.filter((r) => isSatisfied(r.state)).length;
  const total = requirements.length;
  const progress = total > 0 ? (satisfiedCount / total) * 100 : 0;

  const getLinkedDoc = (req: Requirement): DocumentInfo | undefined => {
    return documents.find(
      (d) => d.requirement_id === req.id || d.type === req.doc_type
    );
  };

  const handleUploadComplete = useCallback((reqId: string) => {
    setUploadingFor(null);
    // Show a success feedback briefly; in production, we would poll for validation results
    setFeedback({
      reqId,
      status: "needs_review",
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="text-center">
          {progress === 100 ? (
            <div className="flex flex-col items-center gap-2 text-green-600">
              <CheckCircle className="h-10 w-10" />
              <p className="font-semibold text-lg">All documents complete!</p>
              <p className="text-sm text-muted-foreground">
                Your loan officer will review them shortly.
              </p>
            </div>
          ) : (
            <>
              <p className="text-3xl font-bold">
                {satisfiedCount} of {total}
              </p>
              <p className="text-muted-foreground">documents complete</p>
            </>
          )}
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Requirements */}
      <div className="space-y-3">
        {requirements.map((req) => {
          const doc = getLinkedDoc(req);
          const satisfied = isSatisfied(req.state);
          const showUpload = needsUpload(req.state);
          const docLabel =
            DOC_TYPE_LABELS[req.doc_type as RequiredDocType] ??
            req.doc_type.replace(/_/g, " ");
          const stateLabel =
            REQUIREMENT_STATE_LABELS[req.state as DocumentRequirementState] ??
            req.state.replace(/_/g, " ");

          return (
            <div key={req.id}>
              <div
                className={cn(
                  "p-4 rounded-xl border-2 space-y-2",
                  satisfied
                    ? "border-green-200 bg-green-50"
                    : req.state === "correction_required"
                      ? "border-orange-200 bg-orange-50"
                      : req.state === "uploaded_pending_validation"
                        ? "border-blue-200 bg-blue-50"
                        : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  {stateIcon(req.state)}
                  <div className="flex-1">
                    <p className="font-semibold">{docLabel}</p>
                    <p className="text-xs text-muted-foreground">{stateLabel}</p>
                    {doc?.original_filename && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {doc.original_filename}
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
                          {Math.round(doc.confidence_score * 100)}% confidence
                        </span>
                      </div>
                    )}
                    {doc?.issues && doc.issues.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {doc.issues.map((issue, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-orange-600 flex items-start gap-1"
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>

                {showUpload && uploadingFor !== req.id && (
                  <button
                    onClick={() => setUploadingFor(req.id)}
                    className="w-full mt-2 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Upload className="h-4 w-4" />
                    Upload {docLabel}
                  </button>
                )}

                {uploadingFor === req.id && (
                  <div className="mt-2">
                    <PortalUploader
                      loanToken={loanToken}
                      documentType={req.doc_type}
                      documentLabel={docLabel}
                      onUploaded={() => handleUploadComplete(req.id)}
                    />
                  </div>
                )}

                {satisfied && (
                  <p className="text-xs text-green-600 font-medium">
                    {req.state === "waived_by_officer" ? "Waived" : "Complete"}
                  </p>
                )}

                {req.state === "uploaded_pending_validation" && (
                  <p className="text-xs text-blue-600 font-medium">
                    Processing your document...
                  </p>
                )}
              </div>

              {/* Upload feedback */}
              {feedback && feedback.reqId === req.id && (
                <div className="mt-2">
                  <UploadFeedback
                    status={feedback.status}
                    classifiedType={feedback.docType}
                    confidenceScore={feedback.confidence}
                    issues={feedback.issues}
                    onDismiss={() => setFeedback(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

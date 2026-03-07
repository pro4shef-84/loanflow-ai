"use client";

import { CheckCircle, Circle, AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getChecklistForLoan } from "@/lib/utils/loan-checklist";
import type { LoanType, DocumentType } from "@/lib/types/loan.types";
import type { Database } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

type Document = Database["public"]["Tables"]["documents"]["Row"];

interface DocumentChecklistProps {
  loanType: LoanType;
  documents: Document[];
  onUpload?: (type: DocumentType) => void;
}

export function DocumentChecklist({ loanType, documents, onUpload }: DocumentChecklistProps) {
  const checklist = getChecklistForLoan(loanType);

  const getDocStatus = (type: DocumentType) => {
    return documents.find((d) => d.type === type);
  };

  const verified = checklist.filter((item) => {
    const doc = getDocStatus(item.type);
    return doc?.status === "verified";
  }).length;

  const progress = checklist.length > 0 ? (verified / checklist.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Documents Complete</span>
          <span className="text-muted-foreground">{verified}/{checklist.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="space-y-2">
        {checklist.map((item) => {
          const doc = getDocStatus(item.type);
          const isVerified = doc?.status === "verified";
          const isUploaded = doc && doc.status !== "pending";
          const needsAttention = doc?.status === "needs_attention";

          return (
            <div
              key={item.type}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                isVerified ? "border-green-200 bg-green-50/50" : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                {isVerified ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : needsAttention ? (
                  <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.quantity && (
                    <p className="text-xs text-muted-foreground">Need {item.quantity}</p>
                  )}
                </div>
              </div>

              {!isVerified && onUpload && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => onUpload(item.type)}
                >
                  <Upload className="h-3 w-3" />
                  {isUploaded ? "Replace" : "Upload"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { CheckCircle, Circle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { LoanType } from "@/lib/types/loan.types";
import { getChecklistForLoan } from "@/lib/utils/loan-checklist";
import type { Database } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

type Document = Database["public"]["Tables"]["documents"]["Row"];

interface PortalChecklistProps {
  loanType: LoanType;
  documents: Document[];
  onUpload?: (type: string) => void;
}

export function PortalChecklist({ loanType, documents, onUpload }: PortalChecklistProps) {
  const checklist = getChecklistForLoan(loanType);
  const uploaded = checklist.filter((item) =>
    documents.some((d) => d.type === item.type && d.status !== "pending")
  ).length;
  const progress = checklist.length > 0 ? (uploaded / checklist.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-3xl font-bold mb-1">{uploaded}/{checklist.length}</div>
        <p className="text-muted-foreground text-sm mb-3">Documents submitted</p>
        <Progress value={progress} className="h-3 max-w-xs mx-auto" />
      </div>

      <div className="space-y-3">
        {checklist.map((item) => {
          const doc = documents.find((d) => d.type === item.type);
          const isUploaded = doc && doc.status !== "pending";
          const isVerified = doc?.status === "verified";

          return (
            <div
              key={item.type}
              className={cn(
                "p-4 rounded-xl border-2 space-y-2",
                isVerified
                  ? "border-green-200 bg-green-50"
                  : isUploaded
                  ? "border-blue-200 bg-blue-50"
                  : "border-border"
              )}
            >
              <div className="flex items-start gap-3">
                {isVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : isUploaded ? (
                  <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">Why we need this: {item.whyNeeded}</p>
                </div>
              </div>

              {!isUploaded && onUpload && (
                <button
                  onClick={() => onUpload(item.type)}
                  className="w-full mt-2 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  + Upload {item.label}
                </button>
              )}

              {isUploaded && !isVerified && (
                <p className="text-xs text-blue-600 font-medium">Received — under review</p>
              )}
              {isVerified && (
                <p className="text-xs text-green-600 font-medium">Verified</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

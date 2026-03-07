"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExtractedData, VerificationFlag } from "@/lib/types/document.types";

interface ExtractionPreviewProps {
  extractedData: ExtractedData;
  confidence: number;
  flags?: VerificationFlag[];
}

export function ExtractionPreview({ extractedData, confidence, flags }: ExtractionPreviewProps) {
  const confidencePct = Math.round(confidence * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Extracted Data</CardTitle>
          <Badge
            variant="outline"
            className={
              confidencePct >= 90
                ? "bg-green-50 text-green-700 border-green-200"
                : confidencePct >= 70
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-red-50 text-red-700 border-red-200"
            }
          >
            {confidencePct}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {Object.entries(extractedData).map(([key, value]) => {
            if (key === "confidence" || key === "flags") return null;
            if (value === null || value === undefined) return null;
            return (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            );
          })}
        </div>

        {flags && flags.length > 0 && (
          <div className="pt-2 border-t space-y-1">
            {flags.map((flag, i) => (
              <div
                key={i}
                className={`text-xs flex items-start gap-1 ${
                  flag.type === "error"
                    ? "text-red-600"
                    : flag.type === "warning"
                    ? "text-orange-600"
                    : "text-muted-foreground"
                }`}
              >
                <span>{flag.type === "error" ? "✗" : flag.type === "warning" ? "⚠" : "ℹ"}</span>
                <span>{flag.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

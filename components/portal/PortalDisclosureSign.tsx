"use client";

import { useState } from "react";
import { SignaturePad } from "./SignaturePad";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Disclosure {
  id: string;
  disclosure_type: string;
  status: string;
  stage: string;
  sent_at: string | null;
  signed_at: string | null;
}

interface PortalDisclosureSignProps {
  token: string;
  disclosures: Disclosure[];
}

const DISCLOSURE_LABELS: Record<string, string> = {
  loan_estimate: "Loan Estimate",
  closing_disclosure: "Closing Disclosure",
  intent_to_proceed: "Intent to Proceed",
  right_to_cancel: "Right to Cancel",
  anti_steering: "Anti-Steering Disclosure",
  affiliated_business: "Affiliated Business Disclosure",
  servicing: "Servicing Disclosure",
  arm_disclosure: "ARM Disclosure",
  initial_escrow: "Initial Escrow Statement",
  homeowners_insurance: "Homeowners Insurance Acknowledgment",
};

export function PortalDisclosureSign({ token, disclosures }: PortalDisclosureSignProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [signing, setSigning] = useState<string | null>(null);
  const [signedIds, setSignedIds] = useState<Set<string>>(
    new Set(disclosures.filter((d) => d.status === "signed").map((d) => d.id))
  );
  const [error, setError] = useState<string | null>(null);

  const pending = disclosures.filter(
    (d) => (d.status === "sent" || d.status === "viewed" || d.status === "pending") && !signedIds.has(d.id)
  );
  const signed = disclosures.filter((d) => signedIds.has(d.id) || d.status === "signed");

  if (disclosures.length === 0) return null;

  const handleSign = async (disclosureId: string, dataUrl: string) => {
    setSigning(disclosureId);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disclosureId, signatureDataUrl: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Signing failed");
        return;
      }
      setSignedIds((prev) => new Set([...prev, disclosureId]));
      setExpanded(null);
    } finally {
      setSigning(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-slate-50">
        <FileText className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-sm">Required Disclosures</h3>
        {pending.length > 0 && (
          <Badge variant="destructive" className="ml-auto text-xs">
            {pending.length} pending
          </Badge>
        )}
      </div>

      <div className="divide-y">
        {pending.map((d) => (
          <div key={d.id} className="px-4">
            <button
              className="w-full flex items-center gap-3 py-3.5 text-left"
              onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            >
              <div className="h-7 w-7 rounded-full border-2 border-orange-400 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{DISCLOSURE_LABELS[d.disclosure_type] ?? d.disclosure_type}</p>
                <p className="text-xs text-muted-foreground">Signature required</p>
              </div>
              {expanded === d.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {expanded === d.id && (
              <div className="pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  By signing, you acknowledge receipt of the{" "}
                  <strong>{DISCLOSURE_LABELS[d.disclosure_type] ?? d.disclosure_type}</strong>.
                  Your electronic signature is legally binding under the ESIGN Act.
                </p>
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
                <SignaturePad
                  onSign={(dataUrl) => handleSign(d.id, dataUrl)}
                  disabled={signing === d.id}
                />
                {signing === d.id && (
                  <p className="text-xs text-muted-foreground">Saving signature...</p>
                )}
              </div>
            )}
          </div>
        ))}

        {signed.map((d) => (
          <div key={d.id} className="px-4 py-3.5 flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className={cn("font-medium text-sm text-muted-foreground")}>
                {DISCLOSURE_LABELS[d.disclosure_type] ?? d.disclosure_type}
              </p>
              <p className="text-xs text-muted-foreground">Signed electronically</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

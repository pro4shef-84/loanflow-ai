"use client";

import { use, useState } from "react";
import { useLoan } from "@/hooks/useLoans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, CheckCircle, Clock, Send, Printer } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/date-utils";

type DisclosureStatus = "not_sent" | "sent" | "viewed" | "signed";

interface Disclosure {
  id: string;
  name: string;
  type: "initial" | "revised" | "closing";
  status: DisclosureStatus;
  required: boolean;
  description: string;
  sentAt?: string;
  signedAt?: string;
}

const STATUS_CONFIG: Record<DisclosureStatus, { label: string; color: string }> = {
  not_sent: { label: "Not Sent", color: "text-slate-500 bg-slate-100" },
  sent: { label: "Sent", color: "text-blue-600 bg-blue-100" },
  viewed: { label: "Viewed", color: "text-purple-600 bg-purple-100" },
  signed: { label: "Signed", color: "text-green-600 bg-green-100" },
};

const INITIAL_DISCLOSURES: Omit<Disclosure, "status" | "sentAt" | "signedAt">[] = [
  { id: "loan_estimate", name: "Loan Estimate (LE)", type: "initial", required: true, description: "Initial cost estimate required within 3 business days of application" },
  { id: "right_to_receive", name: "Right to Receive Copy of Appraisal", type: "initial", required: true, description: "Notice required at time of application" },
  { id: "hmda", name: "HMDA/ECOA Notice", type: "initial", required: true, description: "Home Mortgage Disclosure Act notice" },
  { id: "privacy_notice", name: "Privacy Notice (GLB)", type: "initial", required: true, description: "Gramm-Leach-Bliley privacy disclosure" },
  { id: "anti_steering", name: "Anti-Steering Disclosure", type: "initial", required: true, description: "Required for broker transactions" },
  { id: "arm_disclosure", name: "ARM Disclosure", type: "initial", required: false, description: "Required for adjustable rate mortgages" },
  { id: "homeownership_counseling", name: "Homeownership Counseling", type: "initial", required: true, description: "List of HUD-approved counselors" },
];

const CLOSING_DISCLOSURES: Omit<Disclosure, "status" | "sentAt" | "signedAt">[] = [
  { id: "closing_disclosure", name: "Closing Disclosure (CD)", type: "closing", required: true, description: "Final closing costs — must be delivered 3 business days before closing" },
  { id: "right_of_rescission", name: "Right of Rescission", type: "closing", required: false, description: "Required for refinances on primary residence" },
  { id: "initial_escrow", name: "Initial Escrow Statement", type: "closing", required: true, description: "Details of escrow account setup" },
  { id: "transfer_of_servicing", name: "Transfer of Servicing Statement", type: "closing", required: true, description: "Likelihood of loan transfer to another servicer" },
];

export default function DisclosuresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);

  const [disclosureStates, setDisclosureStates] = useState<Record<string, DisclosureStatus>>({});

  const allDisclosures = [...INITIAL_DISCLOSURES, ...CLOSING_DISCLOSURES];

  const getStatus = (discId: string): DisclosureStatus => disclosureStates[discId] ?? "not_sent";

  const markSent = (discId: string) => {
    setDisclosureStates((prev) => ({ ...prev, [discId]: "sent" }));
  };

  const markSigned = (discId: string) => {
    setDisclosureStates((prev) => ({ ...prev, [discId]: "signed" }));
  };

  const sentCount = allDisclosures.filter((d) => ["sent", "viewed", "signed"].includes(getStatus(d.id))).length;
  const signedCount = allDisclosures.filter((d) => getStatus(d.id) === "signed").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Disclosures</h1>
            <p className="text-muted-foreground text-sm">Regulatory disclosure tracking</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 print:hidden">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{allDisclosures.length}</p>
            <p className="text-xs text-muted-foreground">Total Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-600">{signedCount}</p>
            <p className="text-xs text-muted-foreground">Signed</p>
          </CardContent>
        </Card>
      </div>

      {/* Initial Disclosures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Initial Disclosures</CardTitle>
          <CardDescription>Must be delivered within 3 business days of application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {INITIAL_DISCLOSURES.map((disc) => {
            const status = getStatus(disc.id);
            const config = STATUS_CONFIG[status];
            return (
              <div key={disc.id} className="flex items-center justify-between py-2.5 border-b last:border-0 gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {disc.name}
                      {disc.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{disc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                  {status === "not_sent" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => markSent(disc.id)}>
                      <Send className="h-3 w-3" />
                      Send
                    </Button>
                  )}
                  {status === "sent" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600" onClick={() => markSigned(disc.id)}>
                      <CheckCircle className="h-3 w-3" />
                      Sign
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Closing Disclosures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Closing Disclosures</CardTitle>
          <CardDescription>CD must be delivered at least 3 business days before closing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CLOSING_DISCLOSURES.map((disc) => {
            const status = getStatus(disc.id);
            const config = STATUS_CONFIG[status];
            return (
              <div key={disc.id} className="flex items-center justify-between py-2.5 border-b last:border-0 gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {disc.name}
                      {disc.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{disc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                  {status === "not_sent" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => markSent(disc.id)}>
                      <Send className="h-3 w-3" />
                      Send
                    </Button>
                  )}
                  {status === "sent" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600" onClick={() => markSigned(disc.id)}>
                      <CheckCircle className="h-3 w-3" />
                      Sign
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        * Required disclosure. Consult your compliance officer for jurisdiction-specific requirements. This tracker is for reference only.
      </p>
    </div>
  );
}

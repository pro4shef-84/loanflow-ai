"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useLoan } from "@/hooks/useLoans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, CheckCircle, Send, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database.types";

type DisclosureRow = Database["public"]["Tables"]["disclosures"]["Row"];
type DisclosureType = DisclosureRow["disclosure_type"];
type DisclosureStatus = DisclosureRow["status"];

const STATUS_CONFIG: Record<DisclosureStatus, { label: string; color: string }> = {
  pending:  { label: "Not Sent",  color: "text-slate-500 bg-slate-100" },
  sent:     { label: "Sent",      color: "text-blue-600 bg-blue-100" },
  viewed:   { label: "Viewed",    color: "text-purple-600 bg-purple-100" },
  signed:   { label: "Signed",    color: "text-green-600 bg-green-100" },
  waived:   { label: "Waived",    color: "text-orange-500 bg-orange-50" },
};

interface DisclosureTemplate {
  type: DisclosureType;
  name: string;
  description: string;
  required: boolean;
  group: "initial" | "closing";
}

const DISCLOSURE_TEMPLATES: DisclosureTemplate[] = [
  { type: "loan_estimate",         name: "Loan Estimate (LE)",                  description: "Required within 3 business days of application",           required: true,  group: "initial" },
  { type: "anti_steering",         name: "Anti-Steering Disclosure",            description: "Required for broker transactions",                         required: true,  group: "initial" },
  { type: "affiliated_business",   name: "Affiliated Business Arrangement",     description: "Disclose any affiliated service providers",                required: true,  group: "initial" },
  { type: "servicing",             name: "Servicing Disclosure",                description: "Likelihood of loan transfer to another servicer",          required: true,  group: "initial" },
  { type: "right_to_cancel",       name: "Right to Receive Appraisal Copy",     description: "Notice required at time of application",                   required: true,  group: "initial" },
  { type: "arm_disclosure",        name: "ARM Disclosure",                      description: "Required for adjustable rate mortgages",                   required: false, group: "initial" },
  { type: "initial_escrow",        name: "Initial Escrow Statement",            description: "Details of escrow account setup",                          required: true,  group: "initial" },
  { type: "closing_disclosure",    name: "Closing Disclosure (CD)",             description: "Must be delivered at least 3 business days before closing",required: true,  group: "closing" },
  { type: "homeowners_insurance",  name: "Homeowner's Insurance Notice",        description: "Borrower's right to choose insurance provider",            required: true,  group: "closing" },
];

export default function DisclosuresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);

  const [disclosures, setDisclosures] = useState<DisclosureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchDisclosures = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/loans/${id}/disclosures`);
    const json = await res.json();
    if (json.data) setDisclosures(json.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDisclosures(); }, [fetchDisclosures]);

  const getRow = (type: DisclosureType): DisclosureRow | undefined =>
    disclosures.find((d) => d.disclosure_type === type);

  const updateStatus = async (type: DisclosureType, status: DisclosureStatus) => {
    setSaving(type);
    const existing = getRow(type);

    if (existing) {
      const res = await fetch(`/api/loans/${id}/disclosures`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disclosureId: existing.id, status }),
      });
      const json = await res.json();
      if (json.data) {
        setDisclosures((prev) => prev.map((d) => d.id === existing.id ? json.data : d));
      }
    } else {
      // First time touching this disclosure — create it
      const res = await fetch(`/api/loans/${id}/disclosures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disclosure_type: type, status }),
      });
      const json = await res.json();
      if (json.data) {
        setDisclosures((prev) => [...prev, json.data]);
      }
    }
    setSaving(null);
  };

  const getStatus = (type: DisclosureType): DisclosureStatus =>
    getRow(type)?.status ?? "pending";

  const initial = DISCLOSURE_TEMPLATES.filter((t) => t.group === "initial");
  const closing = DISCLOSURE_TEMPLATES.filter((t) => t.group === "closing");
  const allTemplates = DISCLOSURE_TEMPLATES;

  const sentCount  = allTemplates.filter((t) => ["sent","viewed","signed"].includes(getStatus(t.type))).length;
  const signedCount = allTemplates.filter((t) => getStatus(t.type) === "signed").length;

  const renderRow = (tmpl: DisclosureTemplate) => {
    const status = getStatus(tmpl.type);
    const config = STATUS_CONFIG[status];
    const isSaving = saving === tmpl.type;

    return (
      <div key={tmpl.type} className="flex items-center justify-between py-2.5 border-b last:border-0 gap-3">
        <div className="flex items-start gap-2 flex-1">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              {tmpl.name}
              {tmpl.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            <p className="text-xs text-muted-foreground">{tmpl.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
          {status === "pending" && (
            <Button size="sm" variant="outline" className="h-7 gap-1" disabled={isSaving}
              onClick={() => updateStatus(tmpl.type, "sent")}>
              {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send
            </Button>
          )}
          {status === "sent" && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600" disabled={isSaving}
              onClick={() => updateStatus(tmpl.type, "signed")}>
              {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Sign
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Disclosures</h1>
            <p className="text-muted-foreground text-sm">
              {loan?.property_address ?? "Regulatory disclosure tracking"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 print:hidden">
          <Printer className="h-4 w-4" />Print
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{allTemplates.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
          <p className="text-xs text-muted-foreground">Sent</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{signedCount}</p>
          <p className="text-xs text-muted-foreground">Signed</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Initial Disclosures</CardTitle>
              <CardDescription>Must be delivered within 3 business days of application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              {initial.map(renderRow)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Closing Disclosures</CardTitle>
              <CardDescription>CD must be delivered at least 3 business days before closing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              {closing.map(renderRow)}
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground print:hidden">
        * Required disclosure. Consult your compliance officer for jurisdiction-specific requirements.
      </p>
    </div>
  );
}

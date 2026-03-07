"use client";

import { use, useState, useEffect } from "react";
import { useLoan } from "@/hooks/useLoans";
import { useDocuments } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, CheckCircle, Clock, Building2, FileCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/date-utils";
import type { Database } from "@/lib/types/database.types";

type Lender = Database["public"]["Tables"]["lenders"]["Row"];

interface Submission {
  id: string;
  status: string;
  submission_type: string;
  submitted_at: string | null;
  lender_loan_number: string | null;
  notes: string | null;
  documents_included: string[] | null;
  lenders: { name: string; type: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  preparing: { label: "Preparing", color: "text-slate-600 bg-slate-100", icon: Clock },
  submitted: { label: "Submitted", color: "text-blue-600 bg-blue-100", icon: Send },
  acknowledged: { label: "Acknowledged", color: "text-purple-600 bg-purple-100", icon: CheckCircle },
  conditions_issued: { label: "Conditions Issued", color: "text-orange-600 bg-orange-100", icon: FileCheck },
  cleared: { label: "Cleared to Close", color: "text-green-600 bg-green-100", icon: CheckCircle },
};

export default function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);
  const { data: documents } = useDocuments(id);

  const [lenders, setLenders] = useState<Lender[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedLender, setSelectedLender] = useState("");
  const [submissionType, setSubmissionType] = useState<"initial" | "conditions" | "resubmission">("initial");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Fetch lenders
    fetch("/api/loans")
      .then(() => {})
      .catch(() => {});

    // Fetch system lenders directly via Supabase (no dedicated route)
    fetch("/api/loans/" + id + "/submission")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) setSubmissions(data);
      });
  }, [id]);

  // Fetch lenders from loans API lenders table
  useEffect(() => {
    const fetchLenders = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.from("lenders").select("*").order("name");
      if (data) setLenders(data as Lender[]);
    };
    fetchLenders();
  }, []);

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedLender) { setError("Please select a lender"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/loans/${id}/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lenderId: selectedLender,
          submissionType,
          documentsIncluded: selectedDocs,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setSubmissions((prev) => [json.data, ...prev]);
      setSuccess(true);
      setNotes("");
      setSelectedDocs([]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const verifiedDocs = documents?.filter((d) => d.status === "verified") ?? [];
  const uploadedDocs = documents?.filter((d) => !["pending"].includes(d.status)) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Lender Submission</h1>
          <p className="text-muted-foreground text-sm">Submit loan package to wholesale lender</p>
        </div>
      </div>

      {/* Loan Summary */}
      {loan && (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-muted-foreground">Loan:</span>
              <span className="font-medium capitalize">{loan.loan_type?.replace(/_/g, " ")}</span>
              {loan.loan_amount && (
                <><span className="text-muted-foreground">·</span><span className="font-medium">{formatCurrency(loan.loan_amount)}</span></>
              )}
              {loan.property_address && (
                <><span className="text-muted-foreground">·</span><span>{loan.property_address}</span></>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission History */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Submission History</h2>
          {submissions.map((sub) => {
            const config = STATUS_CONFIG[sub.status ?? "submitted"] ?? STATUS_CONFIG.submitted;
            const Icon = config.icon;
            return (
              <Card key={sub.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{sub.lenders?.name ?? "Unknown Lender"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {sub.submission_type?.replace(/_/g, " ")} ·{" "}
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                      </p>
                      {sub.lender_loan_number && (
                        <p className="text-xs text-muted-foreground">Loan #: {sub.lender_loan_number}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={`${config.color} gap-1`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
          <Separator />
        </div>
      )}

      {/* New Submission */}
      <Card>
        <CardHeader>
          <CardTitle>New Submission</CardTitle>
          <CardDescription>Prepare and log your loan package submission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lender *</Label>
              {lenders.length > 0 ? (
                <Select value={selectedLender} onValueChange={setSelectedLender}>
                  <SelectTrigger><SelectValue placeholder="Select lender" /></SelectTrigger>
                  <SelectContent>
                    {lenders.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {l.type && <span className="text-muted-foreground ml-1 text-xs capitalize">({l.type})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Lender name (no lenders in system yet)"
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Submission Type</Label>
              <Select value={submissionType} onValueChange={(v) => setSubmissionType(v as typeof submissionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial Submission</SelectItem>
                  <SelectItem value="conditions">Condition Response</SelectItem>
                  <SelectItem value="resubmission">Resubmission</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document Selection */}
          <div className="space-y-2">
            <Label>Documents to Include</Label>
            {uploadedDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {uploadedDocs.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize flex-1">{doc.type?.replace(/_/g, " ")}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${doc.status === "verified" ? "text-green-600 border-green-200" : ""}`}
                    >
                      {doc.status}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
            {verifiedDocs.length < uploadedDocs.length && uploadedDocs.length > 0 && (
              <p className="text-xs text-orange-600">
                {uploadedDocs.length - verifiedDocs.length} document(s) not yet verified. Consider verifying before submitting.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes / Cover Letter</Label>
            <Textarea
              placeholder="Add notes for the lender, loan scenario details, or cover letter text..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Loan package submitted and logged successfully.
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedLender}
            className="w-full gap-2"
          >
            {submitting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="h-4 w-4" /> Submit Loan Package</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

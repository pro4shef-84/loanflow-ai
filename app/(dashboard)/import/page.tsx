"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, FileJson, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ImportResult {
  imported: number;
  errors: number;
  loan_ids: string[];
  error_details: Array<{ originalId?: string; error: string }>;
}

export default function ImportPage() {
  const [jsonData, setJsonData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonData(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      setError("Invalid JSON. Please check the format of your ARIVE export.");
      setIsImporting(false);
      return;
    }

    try {
      const res = await fetch("/api/import/arive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed }),
      });

      const json = await res.json() as { data?: ImportResult; error?: string };

      if (!res.ok) {
        setError(json.error ?? "Import failed");
        return;
      }

      setResult(json.data ?? null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const loanCount = (() => {
    try {
      const d = JSON.parse(jsonData);
      return Array.isArray(d) ? d.length : 1;
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import from ARIVE</h1>
        <p className="text-muted-foreground">Migrate your existing pipeline into LoanFlow AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload ARIVE JSON Export</CardTitle>
          <CardDescription>
            Export your pipeline from ARIVE as JSON, then upload the file or paste the contents below.
            LoanFlow AI maps loan files, borrower info, and contacts automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File upload */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
              <FileJson className="h-4 w-4" />
              Upload JSON File
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            {jsonData && loanCount !== null && (
              <Badge variant="secondary">{loanCount} loan{loanCount !== 1 ? "s" : ""} detected</Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label>Or paste JSON directly</Label>
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder='[{ "loanAmount": 425000, "borrowerFirstName": "John", ... }]'
              className="min-h-[180px] font-mono text-xs"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  Successfully imported {result.imported} loan file{result.imported !== 1 ? "s" : ""}.
                  {result.errors > 0 && ` ${result.errors} skipped.`}
                </span>
              </div>

              {result.error_details.length > 0 && (
                <div className="space-y-1">
                  {result.error_details.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{e.originalId ? `Loan ${e.originalId}: ` : ""}{e.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.imported > 0 && (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/loans">
                    View imported loans <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={isImporting || !jsonData.trim()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importing..." : `Import ${loanCount ? `${loanCount} Loan${loanCount !== 1 ? "s" : ""}` : ""}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Export from ARIVE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Log into your ARIVE account</li>
            <li>Go to <strong className="text-foreground">Pipeline</strong> → <strong className="text-foreground">Export</strong></li>
            <li>Select <strong className="text-foreground">JSON</strong> format and your desired date range</li>
            <li>Download the file and upload it above</li>
          </ol>
          <p className="text-xs pt-1">
            LoanFlow maps: loan type, amount, property, borrower info, employment, income, assets, co-borrower, and loan status.
            Documents and conditions must be re-uploaded separately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

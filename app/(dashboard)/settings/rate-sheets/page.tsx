"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface ParsedProgram {
  key: string;
  label: string;
  rates: { rate: number; par_price: number; points: number }[];
}

interface RateSheet {
  id: string;
  lender_name: string;
  effective_date: string | null;
  expires_at: string | null;
  status: "processing" | "parsed" | "failed" | "active" | "superseded";
  original_filename: string | null;
  parsed_rates: { lender_name: string; programs: ParsedProgram[]; base_adjustments?: { description: string } } | null;
  created_at: string;
}

const STATUS_CONFIG = {
  processing: { label: "Processing",  color: "text-blue-600 bg-blue-50",   icon: Clock },
  parsed:     { label: "Ready",       color: "text-green-600 bg-green-50", icon: CheckCircle },
  active:     { label: "Active",      color: "text-green-700 bg-green-100",icon: CheckCircle },
  failed:     { label: "Failed",      color: "text-red-600 bg-red-50",     icon: XCircle },
  superseded: { label: "Superseded",  color: "text-slate-500 bg-slate-100",icon: FileText },
};

export default function RateSheetsPage() {
  const [sheets, setSheets] = useState<RateSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lenderName, setLenderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSheets = async () => {
    setLoading(true);
    const res = await fetch("/api/rate-sheets");
    const json = await res.json();
    if (json.data) setSheets(json.data);
    setLoading(false);
  };

  useEffect(() => { fetchSheets(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Select a PDF file first"); return; }
    if (!lenderName.trim()) { setError("Enter the lender name"); return; }

    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("lenderName", lenderName.trim());

    try {
      const res = await fetch("/api/rate-sheets/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setSheets((prev) => [json.data, ...prev]);
      setLenderName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getParRate = (program: ParsedProgram): number | null => {
    if (!program.rates?.length) return null;
    const sorted = [...program.rates].sort((a, b) => Math.abs(a.par_price - 100) - Math.abs(b.par_price - 100));
    return sorted[0]?.rate ?? null;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rate Sheets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload lender rate sheet PDFs — Claude parses them to power the Pricing Engine with real rates.
        </p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import Rate Sheet</CardTitle>
          <CardDescription>Upload your weekly lender PDF. Works with UWM, Rocket Pro TPO, PennyMac, Flagstar, and most wholesale lenders.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lender Name</Label>
                <Input
                  placeholder="e.g. UWM, Rocket Pro TPO"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate Sheet PDF</Label>
                <Input ref={fileRef} type="file" accept=".pdf" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={uploading} className="gap-2">
              {uploading
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Parsing with Claude...</>
                : <><Upload className="h-4 w-4" /> Upload & Parse</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sheet History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Uploaded Sheets</h2>

        {loading ? (
          [1,2].map((i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : sheets.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No rate sheets uploaded yet.</p>
          </CardContent></Card>
        ) : sheets.map((sheet) => {
          const cfg = STATUS_CONFIG[sheet.status] ?? STATUS_CONFIG.parsed;
          const Icon = cfg.icon;
          const isExpanded = expandedId === sheet.id;
          const programs = sheet.parsed_rates?.programs ?? [];

          return (
            <Card key={sheet.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{sheet.lender_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.original_filename}
                        {sheet.effective_date && ` · Effective ${sheet.effective_date}`}
                        {sheet.expires_at && ` · Expires ${new Date(sheet.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs gap-1 ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </Badge>
                    {programs.length > 0 && (
                      <Button
                        variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                        onClick={() => setExpandedId(isExpanded ? null : sheet.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {programs.length} programs
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && programs.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {programs.map((prog) => {
                        const par = getParRate(prog);
                        return (
                          <div key={prog.key} className="bg-slate-50 rounded-md px-3 py-2">
                            <p className="text-xs text-muted-foreground">{prog.label || prog.key}</p>
                            <p className="text-sm font-semibold text-blue-700">
                              {par !== null ? `${par.toFixed(3)}%` : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">par rate</p>
                          </div>
                        );
                      })}
                    </div>
                    {sheet.parsed_rates?.base_adjustments?.description && (
                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                        <span className="font-medium">Adjustments: </span>
                        {sheet.parsed_rates.base_adjustments.description}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Rates are parsed by Claude AI and used automatically in the Pricing Engine. Always verify against the original lender sheet before quoting.
      </p>
    </div>
  );
}

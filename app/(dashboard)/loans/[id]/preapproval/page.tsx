"use client";

import { use, useState } from "react";
import { useLoan } from "@/hooks/useLoans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Printer, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/date-utils";

interface LetterMeta {
  borrowerName: string;
  loanAmount: number | null;
  loanType: string;
  loName: string;
  loNmls: string;
  date: string;
  expiry: string;
}

export default function PreApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [meta, setMeta] = useState<LetterMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-preapproval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanFileId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setLetter(json.data.letter);
      setMeta(json.data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (letter) {
      navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pre-Approval Letter</h1>
            <p className="text-muted-foreground text-sm">AI-generated, ready to share</p>
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          {letter && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
            </>
          )}
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : letter ? "Regenerate" : "Generate Letter"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loan && !letter && !generating && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Generate</CardTitle>
            <CardDescription>
              Generate an AI-drafted pre-approval letter based on this loan file's details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Borrower</p>
                <p className="font-medium">
                  {loan.contacts
                    ? `${(loan.contacts as { first_name: string; last_name: string }).first_name} ${(loan.contacts as { first_name: string; last_name: string }).last_name}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Loan Amount</p>
                <p className="font-medium">{loan.loan_amount ? formatCurrency(loan.loan_amount) : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Loan Type</p>
                <p className="font-medium capitalize">{loan.loan_type?.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Property</p>
                <p className="font-medium">{loan.property_address ?? "To be determined"}</p>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2 mt-2">
              <Sparkles className="h-4 w-4" />
              Generate Pre-Approval Letter
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {letter && meta && (
        <>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Valid until {meta.expiry}</Badge>
            {meta.loanAmount && (
              <Badge variant="outline">{formatCurrency(meta.loanAmount)}</Badge>
            )}
            <Badge variant="outline" className="capitalize">{meta.loanType?.replace(/_/g, " ")}</Badge>
          </div>

          {/* Printable letter */}
          <Card className="print:shadow-none print:border-none">
            <CardContent className="pt-8 pb-8">
              <div className="max-w-2xl mx-auto font-serif space-y-4">
                {/* Letterhead */}
                <div className="text-center border-b pb-4 mb-6 print:border-slate-300">
                  <p className="text-lg font-bold text-blue-700">LoanFlow AI</p>
                  {meta.loNmls && <p className="text-sm text-muted-foreground">NMLS #{meta.loNmls}</p>}
                </div>

                <p className="text-sm text-right text-muted-foreground">{meta.date}</p>

                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {letter}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wand2, Copy, Check, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { UnderwritingNarrativeResult } from "@/lib/agents/underwritingNarrativeAgent";

export default function NarrativePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnderwritingNarrativeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/underwriting-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanFileId: id }),
      });
      const data = await res.json() as { data?: UnderwritingNarrativeResult; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setResult(data.data ?? null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const text = [
      `UNDERWRITING NARRATIVE`,
      `Borrower: ${result.borrowerName}`,
      `Property: ${result.propertyAddress}`,
      `Loan Amount: ${result.loanAmount ? `$${result.loanAmount.toLocaleString()}` : "N/A"}`,
      `Generated: ${new Date(result.generatedAt).toLocaleDateString()}`,
      "",
      ...result.narrative.flatMap((s) => [`${s.title.toUpperCase()}`, s.content, ""]),
      "COMPENSATING FACTORS:",
      ...result.compensatingFactors.map((f) => `• ${f}`),
      "",
      result.riskLayering.length > 0 ? "RISK LAYERING:\n" + result.riskLayering.map((r) => `• ${r}`).join("\n") : "",
      "",
      `RECOMMENDATION: ${result.recommendation}`,
    ].filter((l) => l !== "").join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const recommendationColor = (rec: string) => {
    if (rec.startsWith("APPROVE")) return "bg-green-100 text-green-800 border-green-300";
    if (rec.startsWith("REFER WITH")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-orange-100 text-orange-800 border-orange-300";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Underwriting Narrative</h1>
            <p className="text-muted-foreground text-sm">AI-generated Fannie/Freddie-formatted memo with compensating factors</p>
          </div>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={copyAll} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
        )}
      </div>

      {!result && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Wand2 className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Generate Underwriting Narrative</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                AI will analyze loan data, income, assets, and conditions to draft a professional
                underwriting memo with compensating factors — ready to submit with your file.
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button onClick={generate} disabled={loading} className="gap-2">
              <Wand2 className="h-4 w-4" />
              {loading ? "Generating..." : "Generate Narrative"}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {/* Header info */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{result.borrowerName}</p>
                  <p className="text-sm text-muted-foreground">{result.propertyAddress}</p>
                  {result.loanAmount && (
                    <p className="text-sm text-muted-foreground">
                      ${result.loanAmount.toLocaleString()} · {result.loanNumber ? `File #${result.loanNumber}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`border ${recommendationColor(result.recommendation)} font-semibold`}>
                    {result.recommendation.split("—")[0].trim()}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date(result.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Narrative sections */}
          {result.narrative.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </CardContent>
            </Card>
          ))}

          {/* Compensating factors */}
          {result.compensatingFactors.length > 0 && (
            <Card className="border-green-200">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Compensating Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-1.5">
                  {result.compensatingFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Risk layering */}
          {result.riskLayering.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Layering
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ul className="space-y-1.5">
                  {result.riskLayering.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Regenerate */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={generate} disabled={loading} className="gap-2">
              <Wand2 className="h-4 w-4" />
              {loading ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

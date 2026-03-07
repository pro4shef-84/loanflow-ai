"use client";

import { use, useState } from "react";
import { useLoan } from "@/hooks/useLoans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Cpu, RefreshCw } from "lucide-react";
import Link from "next/link";

interface AUSFinding {
  category: string;
  finding: string;
  severity: "pass" | "warning" | "fail";
}

interface AUSResult {
  recommendation: string;
  confidence: number;
  risk_level: "low" | "medium" | "high";
  findings: AUSFinding[];
  conditions: string[];
  du_message: string;
  inputs: {
    creditScore: number;
    monthlyIncome: number;
    monthlyDebts: number;
    dti: number | null;
    ltv: number | null;
    reserveMonths: number;
  };
}

function SeverityIcon({ severity }: { severity: AUSFinding["severity"] }) {
  if (severity === "pass") return <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />;
  if (severity === "fail") return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
}

export default function AUSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AUSResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creditScore, setCreditScore] = useState("720");
  const [monthlyIncome, setMonthlyIncome] = useState("8000");
  const [monthlyDebts, setMonthlyDebts] = useState("500");
  const [reserveMonths, setReserveMonths] = useState("3");

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/aus-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanFileId: id,
          creditScore: Number(creditScore),
          monthlyIncome: Number(monthlyIncome),
          monthlyDebts: Number(monthlyDebts),
          reserveMonths: Number(reserveMonths),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AUS failed");
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AUS simulation failed");
    } finally {
      setRunning(false);
    }
  };

  const recColor = result?.recommendation?.includes("APPROVE") || result?.recommendation?.includes("ELIGIBLE")
    ? "bg-green-600"
    : result?.recommendation?.includes("CAUTION")
    ? "bg-orange-500"
    : "bg-red-600";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">AUS Simulation</h1>
          <p className="text-muted-foreground text-sm">AI-powered underwriting analysis (DU/LP-style)</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Borrower Qualifying Data</CardTitle>
          <CardDescription>Enter borrower financial data to run the AUS simulation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credit Score (middle)</Label>
              <Input type="number" min={500} max={850} value={creditScore} onChange={(e) => setCreditScore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gross Monthly Income ($)</Label>
              <Input type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Debt Obligations ($)</Label>
              <Input type="number" value={monthlyDebts} onChange={(e) => setMonthlyDebts(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Asset Reserves (months)</Label>
              <Input type="number" min={0} value={reserveMonths} onChange={(e) => setReserveMonths(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleRun} disabled={running} className="w-full mt-4 gap-2">
            {running ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running AUS...</> : <><Cpu className="h-4 w-4" /> Run AUS Simulation</>}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {running && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {result && !running && (
        <div className="space-y-4">
          {/* Recommendation Banner */}
          <Card className={`${recColor} text-white`}>
            <CardContent className="py-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">AUS Recommendation</p>
                <p className="text-2xl font-bold">{result.recommendation}</p>
                <p className="text-sm mt-1 opacity-90">{result.du_message}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{result.confidence}%</div>
                <div className="text-xs opacity-80">Confidence</div>
              </div>
            </CardContent>
          </Card>

          {/* Key Ratios */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "LTV", value: result.inputs.ltv != null ? `${result.inputs.ltv}%` : "—" },
              { label: "DTI", value: result.inputs.dti != null ? `${result.inputs.dti}%` : "—" },
              { label: "Credit Score", value: result.inputs.creditScore },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="py-3 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Findings */}
          {result.findings.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Findings</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.findings.map((finding, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <SeverityIcon severity={finding.severity} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">{finding.category}</span>
                      </div>
                      <p className="text-sm">{finding.finding}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Conditions */}
          {result.conditions.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Underwriting Conditions</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.conditions.map((cond, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      {cond}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center">
            This is an AI simulation only and does not replace an official DU or LPA submission. Results are for informational purposes.
          </p>
        </div>
      )}
    </div>
  );
}

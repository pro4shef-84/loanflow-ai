"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, Download, Printer, FileSpreadsheet } from "lucide-react";

interface MCRData {
  quarter: string;
  year: number;
  totalApplications: number;
  totalOriginations: number;
  totalVolume: number;
  closedLoans: number;
  withdrawnLoans: number;
  pendingLoans: number;
  byLoanType: Record<string, { count: number; volume: number }>;
  byLoanPurpose: Record<string, { count: number; volume: number }>;
  byState: Record<string, { count: number; volume: number }>;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function MCRPage() {
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MCRData | null>(null);

  const fetchMCR = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const quarterIndex = QUARTERS.indexOf(selectedQuarter);
    const startMonth = quarterIndex * 3 + 1;
    const endMonth = startMonth + 2;
    const year = Number(selectedYear);

    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const endDate = new Date(year, endMonth, 0).toISOString().split("T")[0];

    const { data: rawLoans } = await supabase
      .from("loan_files")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    if (!rawLoans) { setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loans = rawLoans as any[];

    const byLoanType: Record<string, { count: number; volume: number }> = {};
    const byLoanPurpose: Record<string, { count: number; volume: number }> = {};
    const byState: Record<string, { count: number; volume: number }> = {};

    let totalVolume = 0;
    let closedLoans = 0;
    let withdrawnLoans = 0;

    for (const loan of loans) {
      const amount = loan.loan_amount ?? 0;
      totalVolume += amount;

      if (loan.status === "closed") closedLoans++;
      if (loan.status === "withdrawn") withdrawnLoans++;

      const lt = loan.loan_type ?? "other";
      byLoanType[lt] = byLoanType[lt] ?? { count: 0, volume: 0 };
      byLoanType[lt].count++;
      byLoanType[lt].volume += amount;

      const lp = loan.loan_purpose ?? "unknown";
      byLoanPurpose[lp] = byLoanPurpose[lp] ?? { count: 0, volume: 0 };
      byLoanPurpose[lp].count++;
      byLoanPurpose[lp].volume += amount;

      const state = loan.property_state ?? "Unknown";
      byState[state] = byState[state] ?? { count: 0, volume: 0 };
      byState[state].count++;
      byState[state].volume += amount;
    }

    setData({
      quarter: selectedQuarter,
      year,
      totalApplications: loans.length,
      totalOriginations: closedLoans,
      totalVolume,
      closedLoans,
      withdrawnLoans,
      pendingLoans: loans.length - closedLoans - withdrawnLoans,
      byLoanType,
      byLoanPurpose,
      byState,
    });
    setLoading(false);
  };

  useEffect(() => { fetchMCR(); }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mortgage Call Report (MCR)</h1>
            <p className="text-muted-foreground">Quarterly regulatory reporting summary</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="print:hidden">
        <CardContent className="py-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quarter:</span>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Year:</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchMCR} disabled={loading}>
            {loading ? "Loading..." : "Generate Report"}
          </Button>
          {data && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              {data.quarter} {data.year}
            </Badge>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Header Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Applications", value: data.totalApplications, color: "text-blue-700" },
              { label: "Loans Originated", value: data.totalOriginations, color: "text-green-700" },
              { label: "Total Volume", value: fmt(data.totalVolume), color: "text-purple-700" },
              { label: "Pending", value: data.pendingLoans, color: "text-orange-700" },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="py-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section 1: Applications by Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Section 1: Application Activity</CardTitle>
              <CardDescription>{data.quarter} {data.year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  ["Total Applications Received", data.totalApplications],
                  ["Loans Closed / Originated", data.closedLoans],
                  ["Loans Withdrawn", data.withdrawnLoans],
                  ["Applications Pending", data.pendingLoans],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between border-b pb-2 last:border-0">
                    <span>{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: By Loan Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Section 2: Originations by Loan Type</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.byLoanType).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data for this period.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground uppercase mb-2">
                    <span>Loan Type</span>
                    <span className="text-right">Count</span>
                    <span className="text-right">Volume</span>
                  </div>
                  {Object.entries(data.byLoanType).map(([type, stats]) => (
                    <div key={type} className="grid grid-cols-3 border-b pb-1.5 last:border-0">
                      <span className="capitalize">{type.replace(/_/g, " ")}</span>
                      <span className="text-right">{stats.count}</span>
                      <span className="text-right font-medium">{fmt(stats.volume)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: By Purpose */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Section 3: Originations by Loan Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.byLoanPurpose).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data for this period.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground uppercase mb-2">
                    <span>Purpose</span>
                    <span className="text-right">Count</span>
                    <span className="text-right">Volume</span>
                  </div>
                  {Object.entries(data.byLoanPurpose).map(([purpose, stats]) => (
                    <div key={purpose} className="grid grid-cols-3 border-b pb-1.5 last:border-0">
                      <span className="capitalize">{purpose.replace(/_/g, " ")}</span>
                      <span className="text-right">{stats.count}</span>
                      <span className="text-right font-medium">{fmt(stats.volume)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: By State */}
          {Object.keys(data.byState).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Section 4: Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground uppercase mb-2">
                    <span>State</span>
                    <span className="text-right">Count</span>
                    <span className="text-right">Volume</span>
                  </div>
                  {Object.entries(data.byState)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([state, stats]) => (
                      <div key={state} className="grid grid-cols-3 border-b pb-1.5 last:border-0">
                        <span>{state}</span>
                        <span className="text-right">{stats.count}</span>
                        <span className="text-right font-medium">{fmt(stats.volume)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            This MCR summary is generated from LoanFlow AI data. Official MCR filings must be submitted through NMLS. Verify figures with your compliance team.
          </p>
        </>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select a period and click Generate Report</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useLoans } from "@/hooks/useLoans";
import type { LoanWithRelations } from "@/hooks/useLoans";
import { usePulseEvents, useUpdatePulseEvent } from "@/hooks/usePulse";
import { LoanCard } from "@/components/loans/LoanCard";
import { DeadlineAlert } from "@/components/loans/DeadlineAlert";
import { PulseEventCard } from "@/components/pulse/PulseEventCard";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil } from "@/lib/utils/date-utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Plus, FileText, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";

interface MarketRates {
  configured: boolean;
  week?: string;
  rate30yr?: number;
  rate15yr?: number;
  change30yr?: number;
  change15yr?: number;
  source?: string;
  error?: string;
  message?: string;
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function RateChange({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined) return null;
  if (change === 0) return <Minus className="h-3 w-3 text-slate-400 inline" />;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${up ? "text-red-500" : "text-green-600"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

export default function DashboardPage() {
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: pulseEvents } = usePulseEvents();
  const updatePulse = useUpdatePulseEvent();
  const [marketRates, setMarketRates] = useState<MarketRates | null>(null);

  useEffect(() => {
    fetch("/api/market-rates")
      .then((r) => r.json())
      .then(setMarketRates)
      .catch(() => {});
  }, []);

  const activeLoans = loans?.filter((l) => !["closed", "withdrawn"].includes(l.status)) ?? [];
  const closedThisMonth = loans?.filter((l) => {
    if (l.status !== "closed" || !l.closing_date) return false;
    const d = new Date(l.closing_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }) ?? [];

  const upcomingDeadlines = loans
    ?.flatMap((loan) => {
      const borrowerName = loan.contacts
        ? `${loan.contacts.first_name} ${loan.contacts.last_name}`
        : loan.file_number ?? "Loan";
      const items: Array<{ loanId: string; borrowerName: string; deadlineType: "closing" | "rate_lock"; date: string; label: string }> = [];
      if (loan.closing_date) {
        const days = daysUntil(loan.closing_date);
        if (days !== null && days >= -1 && days <= 14) {
          items.push({ loanId: loan.id, borrowerName, deadlineType: "closing", date: loan.closing_date, label: "Closing Date" });
        }
      }
      if (loan.rate_lock_expires_at) {
        const days = daysUntil(loan.rate_lock_expires_at);
        if (days !== null && days >= -1 && days <= 7) {
          items.push({ loanId: loan.id, borrowerName, deadlineType: "rate_lock", date: loan.rate_lock_expires_at, label: "Rate Lock Expires" });
        }
      }
      return items;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5) ?? [];

  const pipelineValue = activeLoans.reduce((sum, l) => sum + (l.loan_amount ?? 0), 0);
  const volumeThisMonth = closedThisMonth.reduce((sum, l) => sum + (l.loan_amount ?? 0), 0);

  const stats = [
    { label: "Active Loans", value: activeLoans.length, display: String(activeLoans.length), icon: FileText, color: "text-blue-600" },
    { label: "Pipeline Value", value: pipelineValue, display: formatMoney(pipelineValue), icon: DollarSign, color: "text-blue-600" },
    { label: "Closed This Month", value: closedThisMonth.length, display: `${closedThisMonth.length} (${formatMoney(volumeThisMonth)})`, icon: CheckCircle, color: "text-green-600" },
    { label: "Deadlines This Week", value: upcomingDeadlines.filter((d) => (daysUntil(d.date) ?? 99) <= 7).length, display: String(upcomingDeadlines.filter((d) => (daysUntil(d.date) ?? 99) <= 7).length), icon: AlertTriangle, color: "text-orange-600" },
    { label: "Pulse Opportunities", value: pulseEvents?.length ?? 0, display: String(pulseEvents?.length ?? 0), icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <UpgradePrompt />
      <OnboardingChecklist />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your pipeline at a glance</p>
        </div>
        <Button asChild>
          <Link href="/loans/new">
            <Plus className="h-4 w-4 mr-2" />
            New Loan File
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-7 w-7 ${stat.color}`} />
                <div>
                  <p className="text-xl font-bold leading-tight">{stat.display}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Market Rates Widget */}
      {marketRates?.configured && !marketRates.error && marketRates.rate30yr && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-6 flex-wrap">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                Freddie Mac PMMS
                {marketRates.week && <span className="font-normal ml-1">· {marketRates.week}</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{marketRates.rate30yr?.toFixed(2)}%</span>
                <span className="text-xs text-muted-foreground">30yr fixed</span>
                <RateChange change={marketRates.change30yr} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{marketRates.rate15yr?.toFixed(2)}%</span>
                <span className="text-xs text-muted-foreground">15yr fixed</span>
                <RateChange change={marketRates.change15yr} />
              </div>
              <p className="text-xs text-muted-foreground ml-auto hidden sm:block">via FRED · weekly survey</p>
            </div>
          </CardContent>
        </Card>
      )}
      {marketRates?.configured === false && (
        <div className="text-xs text-muted-foreground bg-slate-50 border rounded px-3 py-2">
          Add <code className="font-mono">FRED_API_KEY</code> to your environment to show live Freddie Mac PMMS rates here.{" "}
          <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noreferrer" className="underline">Get a free key →</a>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Active Pipeline</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/loans">View all</Link>
            </Button>
          </div>

          {loansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : activeLoans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No active loans. Create your first loan file to get started.</p>
                <Button asChild className="mt-4">
                  <Link href="/loans/new">Create Loan File</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeLoans.slice(0, 6).map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Upcoming Deadlines</h2>
            {upcomingDeadlines.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No deadlines in the next 14 days
                </CardContent>
              </Card>
            ) : (
              upcomingDeadlines.map((d, i) => (
                <DeadlineAlert key={i} deadline={d} />
              ))
            )}
          </div>

          {pulseEvents && pulseEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Pulse Alerts</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/pulse">View all</Link>
                </Button>
              </div>
              {pulseEvents.slice(0, 2).map((event) => (
                <PulseEventCard
                  key={event.id}
                  event={event}
                  onNudge={(id) => updatePulse.mutate({ id, actionTaken: "nudge_sent" })}
                  onDismiss={(id) => updatePulse.mutate({ id, actionTaken: "dismissed" })}
                  onSnooze={(id) => updatePulse.mutate({ id, actionTaken: "snoozed" })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

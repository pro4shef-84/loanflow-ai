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
import { Plus, FileText, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: pulseEvents } = usePulseEvents();
  const updatePulse = useUpdatePulseEvent();

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

  const stats = [
    { label: "Active Loans", value: activeLoans.length, icon: FileText, color: "text-blue-600" },
    { label: "Deadlines This Week", value: upcomingDeadlines.filter((d) => (daysUntil(d.date) ?? 99) <= 7).length, icon: AlertTriangle, color: "text-orange-600" },
    { label: "Pulse Opportunities", value: pulseEvents?.length ?? 0, icon: TrendingUp, color: "text-purple-600" },
    { label: "Closed This Month", value: closedThisMonth.length, icon: CheckCircle, color: "text-green-600" },
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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

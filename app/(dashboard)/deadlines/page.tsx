"use client";

import { useLoans } from "@/hooks/useLoans";
import { DeadlineAlert } from "@/components/loans/DeadlineAlert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil } from "@/lib/utils/date-utils";
import { Calendar } from "lucide-react";
import type { Database } from "@/lib/types/database.types";

type LoanFile = Database["public"]["Tables"]["loan_files"]["Row"] & {
  contacts?: Database["public"]["Tables"]["contacts"]["Row"] | null;
};

export default function DeadlinesPage() {
  const { data: loans, isLoading } = useLoans();

  const deadlines = (loans ?? [])
    .flatMap((loan) => {
      const loanTyped = loan as LoanFile;
      const borrowerName = loanTyped.contacts
        ? `${loanTyped.contacts.first_name} ${loanTyped.contacts.last_name}`
        : loan.file_number ?? "Loan";

      const items = [];

      if (loan.closing_date) {
        items.push({
          loanId: loan.id,
          borrowerName,
          deadlineType: "closing" as const,
          date: loan.closing_date,
          label: "Closing Date",
        });
      }

      if (loan.rate_lock_expires_at) {
        items.push({
          loanId: loan.id,
          borrowerName,
          deadlineType: "rate_lock" as const,
          date: loan.rate_lock_expires_at,
          label: "Rate Lock Expires",
        });
      }

      return items;
    })
    .filter((d) => {
      const days = daysUntil(d.date);
      return days !== null && days >= -7;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const overdue = deadlines.filter((d) => (daysUntil(d.date) ?? 0) < 0);
  const thisWeek = deadlines.filter((d) => { const n = daysUntil(d.date) ?? 0; return n >= 0 && n <= 7; });
  const later = deadlines.filter((d) => (daysUntil(d.date) ?? 0) > 7);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deadline Command Center</h1>
        <p className="text-muted-foreground">All upcoming closings and rate lock expirations</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : deadlines.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No upcoming deadlines.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-red-600">Overdue ({overdue.length})</h2>
              {overdue.map((d, i) => <DeadlineAlert key={i} deadline={d} />)}
            </section>
          )}
          {thisWeek.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-orange-600">This Week ({thisWeek.length})</h2>
              {thisWeek.map((d, i) => <DeadlineAlert key={i} deadline={d} />)}
            </section>
          )}
          {later.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-muted-foreground">Coming Up ({later.length})</h2>
              {later.map((d, i) => <DeadlineAlert key={i} deadline={d} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

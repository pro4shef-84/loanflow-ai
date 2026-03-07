"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoanStatusBadge } from "./LoanStatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils/date-utils";
import { LOAN_TYPE_LABELS } from "@/lib/types/loan.types";
import type { LoanWithRelations } from "@/hooks/useLoans";

interface LoanCardProps {
  loan: LoanWithRelations;
}

export function LoanCard({ loan }: LoanCardProps) {
  const borrowerName = loan.contacts
    ? `${loan.contacts.first_name} ${loan.contacts.last_name}`
    : "Unknown Borrower";

  const address = loan.property_address
    ? `${loan.property_address}, ${loan.property_city ?? ""} ${loan.property_state ?? ""}`
    : "No property address";

  return (
    <Link href={`/loans/${loan.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{borrowerName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{address}</p>
            </div>
            <LoanStatusBadge status={loan.status} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {LOAN_TYPE_LABELS[loan.loan_type]}
              </Badge>
              {loan.loan_amount && (
                <span className="text-muted-foreground">{formatCurrency(loan.loan_amount)}</span>
              )}
            </div>
            {loan.closing_date && (
              <span className="text-xs text-muted-foreground">
                Close: {formatDate(loan.closing_date)}
              </span>
            )}
          </div>
          {loan.submission_readiness_score !== null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${loan.submission_readiness_score}%` }}
                />
              </div>
              <span className="text-xs font-medium">{loan.submission_readiness_score}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

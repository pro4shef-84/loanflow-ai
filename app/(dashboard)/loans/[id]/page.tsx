"use client";

import { use } from "react";
import { useLoan, useUpdateLoan } from "@/hooks/useLoans";
import { LoanStatusBadge } from "@/components/loans/LoanStatusBadge";
import { ReadinessScore } from "@/components/loans/ReadinessScore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils/date-utils";
import { LOAN_TYPE_LABELS, LOAN_STATUS_ORDER } from "@/lib/types/loan.types";
import type { ReadinessScore as ReadinessScoreType } from "@/lib/types/loan.types";
import { ArrowLeft, ExternalLink, Copy } from "lucide-react";
import Link from "next/link";

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan, isLoading } = useLoan(id);
  const updateLoan = useUpdateLoan(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Loan file not found.</p>
        <Button asChild className="mt-4"><Link href="/loans">Back to Loans</Link></Button>
      </div>
    );
  }

  const borrowerName = loan.contacts
    ? `${loan.contacts.first_name} ${loan.contacts.last_name}`
    : "Unknown Borrower";

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${loan.portal_token}`;
  const readiness = loan.readiness_breakdown as unknown as ReadinessScoreType | null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/loans"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{borrowerName}</h1>
              <LoanStatusBadge status={loan.status} />
            </div>
            <p className="text-muted-foreground">
              {LOAN_TYPE_LABELS[loan.loan_type]}
              {loan.loan_amount && ` · ${formatCurrency(loan.loan_amount)}`}
              {loan.file_number && ` · #${loan.file_number}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/loans/${id}/documents`}>Documents</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/loans/${id}/conditions`}>Conditions</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" asChild><Link href={`/loans/${id}`}>Overview</Link></TabsTrigger>
          <TabsTrigger value="documents" asChild><Link href={`/loans/${id}/documents`}>Documents</Link></TabsTrigger>
          <TabsTrigger value="conditions" asChild><Link href={`/loans/${id}/conditions`}>Conditions</Link></TabsTrigger>
          <TabsTrigger value="communications" asChild><Link href={`/loans/${id}/communications`}>Messages</Link></TabsTrigger>
          <TabsTrigger value="readiness" asChild><Link href={`/loans/${id}/readiness`}>Readiness</Link></TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Loan Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Property</p><p className="font-medium">{loan.property_address ?? "—"}</p></div>
                <div><p className="text-muted-foreground">City / State</p><p className="font-medium">{[loan.property_city, loan.property_state].filter(Boolean).join(", ") || "—"}</p></div>
                <div><p className="text-muted-foreground">Est. Value</p><p className="font-medium">{loan.estimated_value ? formatCurrency(loan.estimated_value) : "—"}</p></div>
                <div><p className="text-muted-foreground">Loan Purpose</p><p className="font-medium capitalize">{loan.loan_purpose?.replace(/_/g, " ") ?? "—"}</p></div>
                <div><p className="text-muted-foreground">Closing Date</p><p className="font-medium">{formatDate(loan.closing_date)}</p></div>
                <div><p className="text-muted-foreground">Rate Lock Expires</p><p className="font-medium">{formatDate(loan.rate_lock_expires_at)}</p></div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Update Status</p>
                <Select
                  value={loan.status}
                  onValueChange={(val) => updateLoan.mutate({ status: val as typeof loan.status })}
                >
                  <SelectTrigger className="w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Borrower Portal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Share this link with the borrower. They can upload documents without logging in.
              </p>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border">
                <code className="text-xs flex-1 truncate">{portalUrl}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(portalUrl)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href={`/portal/${loan.portal_token}`} target="_blank">
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {readiness && loan.submission_readiness_score !== null && (
            <Card>
              <CardHeader><CardTitle className="text-base">Readiness Score</CardTitle></CardHeader>
              <CardContent>
                <ReadinessScore score={{ ...readiness, score: loan.submission_readiness_score! }} compact />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documents</span>
                <Badge variant="outline">{loan.documents?.length ?? 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Conditions</span>
                <Badge variant="outline">{loan.conditions?.filter((c) => c.status === "open").length ?? 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(loan.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

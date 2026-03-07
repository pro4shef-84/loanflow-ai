"use client";

import { useState } from "react";
import { useLoans } from "@/hooks/useLoans";
import { LoanCard } from "@/components/loans/LoanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOAN_STATUS_ORDER } from "@/lib/types/loan.types";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

export default function LoansPage() {
  const { data: loans, isLoading } = useLoans();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = (loans ?? []).filter((loan) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      (loan.contacts?.first_name?.toLowerCase().includes(query)) ||
      (loan.contacts?.last_name?.toLowerCase().includes(query)) ||
      (loan.property_address?.toLowerCase().includes(query)) ||
      (loan.file_number?.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Files</h1>
          <p className="text-muted-foreground">{loans?.length ?? 0} total files</p>
        </div>
        <Button asChild>
          <Link href="/loans/new">
            <Plus className="h-4 w-4 mr-2" />
            New Loan File
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by borrower, address, file number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex w-max gap-0">
            <TabsTrigger value="all">All ({loans?.length ?? 0})</TabsTrigger>
            {LOAN_STATUS_ORDER.map((status) => {
              const count = loans?.filter((l) => l.status === status).length ?? 0;
              return (
                <TabsTrigger key={status} value={status}>
                  {status.replace(/_/g, " ")} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No loan files found</p>
          <Button asChild className="mt-4">
            <Link href="/loans/new">Create your first loan file</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}
    </div>
  );
}

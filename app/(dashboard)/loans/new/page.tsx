"use client";

import { useRouter } from "next/navigation";
import { LoanForm } from "@/components/loans/LoanForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCreateLoan } from "@/hooks/useLoans";
import { createClient } from "@/lib/supabase/client";
import { getRequiredDocTypes } from "@/lib/utils/loan-checklist";
import type { LoanType } from "@/lib/types/loan.types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface LoanFormValues {
  loan_type: "purchase" | "refinance" | "heloc" | "non_qm" | "va" | "fha" | "usda";
  loan_purpose?: "primary_residence" | "second_home" | "investment";
  loan_amount?: number;
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  estimated_value?: number;
  closing_date?: string;
  notes?: string;
}

export default function NewLoanPage() {
  const router = useRouter();
  const createLoan = useCreateLoan();
  const supabase = createClient();

  const handleSubmit = async (values: LoanFormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const loan = await createLoan.mutateAsync({
      ...values,
      user_id: user.id,
      status: "intake",
    });

    const requiredDocs = getRequiredDocTypes(values.loan_type as LoanType);
    await Promise.all(
      requiredDocs.map((docType) =>
        supabase.from("documents").insert({
          loan_file_id: loan.id,
          type: docType,
          status: "pending",
          required: true,
        })
      )
    );

    router.push(`/loans/${loan.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/loans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Loan File</h1>
          <p className="text-muted-foreground">Start a new loan intake</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>
            Fill in the basic loan information. Document checklist will be auto-generated based on loan type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoanForm
            onSubmit={handleSubmit}
            isLoading={createLoan.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

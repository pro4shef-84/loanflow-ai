"use client";

import { use, useState } from "react";
import { useLoan } from "@/hooks/useLoans";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import Link from "next/link";
import { LOAN_TYPE_LABELS } from "@/lib/types/loan.types";
import { formatCurrency } from "@/lib/utils/date-utils";

interface LEFormValues {
  interestRate: string;
  originationFee: string;
  discountPoints: string;
  appraisalFee: string;
  creditReport: string;
  floodDetermination: string;
  taxMonitoring: string;
  titleLenderPolicy: string;
  titleSettlement: string;
  titleSearch: string;
  recordingFees: string;
  transferTax: string;
  prepaidInterestDays: string;
  prepaidInterestRate: string;
  insuranceMonths: string;
  insuranceMonthlyPremium: string;
  propertyTaxMonths: string;
  propertyTaxMonthlyAmount: string;
  initialEscrowPayment: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function monthlyPayment(principal: number, rate: number, years: number) {
  const r = rate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export default function LoanEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);
  const [showLE, setShowLE] = useState(false);

  const { register, handleSubmit, watch } = useForm<LEFormValues>({
    defaultValues: {
      interestRate: "7.000",
      originationFee: "0",
      discountPoints: "0",
      appraisalFee: "600",
      creditReport: "35",
      floodDetermination: "25",
      taxMonitoring: "75",
      titleLenderPolicy: "900",
      titleSettlement: "500",
      titleSearch: "300",
      recordingFees: "150",
      transferTax: "0",
      prepaidInterestDays: "15",
      prepaidInterestRate: "7.000",
      insuranceMonths: "12",
      insuranceMonthlyPremium: "150",
      propertyTaxMonths: "3",
      propertyTaxMonthlyAmount: "400",
      initialEscrowPayment: "0",
    }
  });

  const values = watch();
  const loanAmount = loan?.loan_amount ?? 0;
  const rate = parseFloat(values.interestRate) || 0;
  const termYears = 30;

  const pi = Math.round(monthlyPayment(loanAmount, rate, termYears));

  const sectionA = (parseFloat(values.originationFee) || 0) + (parseFloat(values.discountPoints) || 0) * loanAmount / 100;
  const sectionB = (parseFloat(values.appraisalFee) || 0) + (parseFloat(values.creditReport) || 0) +
    (parseFloat(values.floodDetermination) || 0) + (parseFloat(values.taxMonitoring) || 0);
  const sectionC = (parseFloat(values.titleLenderPolicy) || 0) + (parseFloat(values.titleSettlement) || 0) +
    (parseFloat(values.titleSearch) || 0);
  const sectionE = (parseFloat(values.recordingFees) || 0);
  const sectionF = (parseFloat(values.transferTax) || 0);
  const prepaidInterest = Math.round((loanAmount * (rate / 100)) / 365 * (parseFloat(values.prepaidInterestDays) || 15));
  const prepaidInsurance = Math.round((parseFloat(values.insuranceMonths) || 0) * (parseFloat(values.insuranceMonthlyPremium) || 0));
  const sectionF2 = prepaidInterest + prepaidInsurance;
  const initialEscrow = Math.round((parseFloat(values.propertyTaxMonths) || 0) * (parseFloat(values.propertyTaxMonthlyAmount) || 0) +
    (parseFloat(values.initialEscrowPayment) || 0));

  const closingCostsSubtotal = sectionA + sectionB + sectionC + sectionE + sectionF;
  const prepaidSubtotal = sectionF2 + initialEscrow;
  const totalClosingCosts = closingCostsSubtotal + prepaidSubtotal;
  const downPayment = (loan?.estimated_value ?? 0) - loanAmount;
  const cashToClose = downPayment + totalClosingCosts;

  const apr = rate + (sectionA / loanAmount) * (1 / (termYears * 12)) * 12 * 100;

  if (!loan) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Loan Estimate</h1>
            <p className="text-muted-foreground text-sm">TRID-formatted cost estimate</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLE(!showLE)} className="gap-1">
            <FileText className="h-4 w-4" />
            {showLE ? "Edit" : "Preview LE"}
          </Button>
          {showLE && (
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          )}
        </div>
      </div>

      {!showLE ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Loan Terms</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Amount</span>
                <span className="font-medium">{fmt(loanAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Type</span>
                <span className="font-medium">{LOAN_TYPE_LABELS[loan.loan_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Term</span>
                <span className="font-medium">30 Years</span>
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input type="number" step="0.001" {...register("interestRate")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">A. Origination Charges</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Origination Fee ($)</Label>
                <Input type="number" {...register("originationFee")} />
              </div>
              <div className="space-y-2">
                <Label>Discount Points (%)</Label>
                <Input type="number" step="0.125" min={0} max={3} {...register("discountPoints")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">B. Services (Cannot Shop)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Appraisal Fee", key: "appraisalFee" as const },
                { label: "Credit Report", key: "creditReport" as const },
                { label: "Flood Determination", key: "floodDetermination" as const },
                { label: "Tax Monitoring", key: "taxMonitoring" as const },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="w-40 shrink-0 text-xs">{label}</Label>
                  <Input type="number" {...register(key)} className="text-right" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">C. Title Services</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Lender's Title Policy", key: "titleLenderPolicy" as const },
                { label: "Settlement Fee", key: "titleSettlement" as const },
                { label: "Title Search", key: "titleSearch" as const },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="w-40 shrink-0 text-xs">{label}</Label>
                  <Input type="number" {...register(key)} className="text-right" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">E–F. Taxes & Government Fees</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-40 shrink-0 text-xs">Recording Fees</Label>
                <Input type="number" {...register("recordingFees")} className="text-right" />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-40 shrink-0 text-xs">Transfer Tax</Label>
                <Input type="number" {...register("transferTax")} className="text-right" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">G–H. Prepaids & Escrow</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Prepaid Interest (days)</Label>
                  <Input type="number" {...register("prepaidInterestDays")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Insurance (months)</Label>
                  <Input type="number" {...register("insuranceMonths")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Insurance $/mo</Label>
                  <Input type="number" {...register("insuranceMonthlyPremium")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tax Escrow (months)</Label>
                  <Input type="number" {...register("propertyTaxMonths")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Property Tax $/mo</Label>
                  <Input type="number" {...register("propertyTaxMonthlyAmount")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">P&I Payment</p>
                  <p className="text-xl font-bold text-blue-700">{fmt(pi)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Closing Costs</p>
                  <p className="text-xl font-bold">{fmt(totalClosingCosts)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cash to Close</p>
                  <p className="text-xl font-bold">{fmt(cashToClose)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">APR</p>
                  <p className="text-xl font-bold">{apr.toFixed(3)}%</p>
                </div>
              </div>
              <div className="mt-3 flex justify-center">
                <Button onClick={() => setShowLE(true)} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Preview Loan Estimate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* LE Preview */
        <div className="bg-white border rounded-lg p-8 space-y-6 max-w-3xl mx-auto print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold">Loan Estimate</h2>
              <Badge className="mt-1">SAVE THIS LOAN ESTIMATE TO COMPARE WITH YOUR CLOSING DISCLOSURE</Badge>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold">LoanFlow AI</p>
              <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Applicant info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Applicant</p>
              <p className="font-medium">
                {loan.contacts
                  ? `${(loan.contacts as { first_name: string; last_name: string }).first_name} ${(loan.contacts as { first_name: string; last_name: string }).last_name}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Property</p>
              <p className="font-medium">{loan.property_address ?? "TBD"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Sale Price</p>
              <p className="font-medium">{fmt(loan.estimated_value ?? 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Loan Purpose</p>
              <p className="font-medium capitalize">{loan.loan_purpose?.replace(/_/g, " ") ?? "Purchase"}</p>
            </div>
          </div>

          <Separator />

          {/* Loan Terms */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Loan Terms</h3>
            <div className="border rounded-md overflow-hidden">
              {[
                ["Loan Amount", fmt(loanAmount)],
                ["Interest Rate", `${rate.toFixed(3)}%`],
                ["Monthly Principal & Interest", `${fmt(pi)}`],
                ["Prepayment Penalty", "NO"],
                ["Balloon Payment", "NO"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-2 border-b last:border-0 text-sm">
                  <span>{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projected Payments */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Projected Payments</h3>
            <div className="border rounded-md overflow-hidden">
              {[
                ["Principal & Interest", fmt(pi)],
                ["Mortgage Insurance", "—"],
                ["Estimated Escrow", fmt(Math.round((parseFloat(values.insuranceMonthlyPremium) || 0) + (parseFloat(values.propertyTaxMonthlyAmount) || 0)))],
                ["Estimated Total Monthly Payment", fmt(pi + Math.round((parseFloat(values.insuranceMonthlyPremium) || 0) + (parseFloat(values.propertyTaxMonthlyAmount) || 0)))],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-2 border-b last:border-0 text-sm">
                  <span>{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Closing Cost Details */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Closing Cost Details</h3>
            <div className="space-y-3">
              {[
                { label: "A. Origination Charges", amount: sectionA },
                { label: "B. Services You Cannot Shop For", amount: sectionB },
                { label: "C. Services You Can Shop For (Title)", amount: sectionC },
                { label: "E. Taxes & Other Government Fees", amount: sectionE },
                { label: "F. Prepaids", amount: sectionF2 },
                { label: "G. Initial Escrow Payment at Closing", amount: initialEscrow },
              ].map(({ label, amount }) => (
                <div key={label} className="flex justify-between text-sm border-b pb-2">
                  <span>{label}</span>
                  <span className="font-medium">{fmt(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded">
                <span>J. TOTAL CLOSING COSTS</span>
                <span>{fmt(totalClosingCosts)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cash to Close */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Closing Costs</p>
              <p className="text-lg font-bold">{fmt(totalClosingCosts)}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Down Payment</p>
              <p className="text-lg font-bold">{fmt(downPayment)}</p>
            </div>
            <div className="border-2 border-blue-600 rounded-md p-3 bg-blue-50">
              <p className="text-xs text-muted-foreground">Cash to Close</p>
              <p className="text-lg font-bold text-blue-700">{fmt(cashToClose)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This is not a commitment to lend. Actual rates, terms, and fees may vary. The Loan Estimate is provided for informational purposes only. APR: {apr.toFixed(3)}%.
          </p>
        </div>
      )}
    </div>
  );
}

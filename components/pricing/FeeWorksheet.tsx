"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FeeWorksheetItem } from "@/lib/utils/pricing-engine";

interface FeeWorksheetProps {
  fees: FeeWorksheetItem[];
  totalClosingCosts: number;
  cashToClose: number;
  downPayment: number;
}

const CATEGORY_LABELS = {
  origination: "A. Origination Charges",
  appraisal_title: "B. Services You Cannot Shop For",
  government: "C. Taxes & Government Fees",
  prepaids: "D. Prepaids & Escrow",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type CategoryKey = keyof typeof CATEGORY_LABELS;

export function FeeWorksheet({ fees, totalClosingCosts, cashToClose, downPayment }: FeeWorksheetProps) {
  const byCategory = fees.reduce<Record<string, FeeWorksheetItem[]>>((acc, fee) => {
    if (!acc[fee.category]) acc[fee.category] = [];
    acc[fee.category].push(fee);
    return acc;
  }, {});

  const categories = (Object.keys(CATEGORY_LABELS) as CategoryKey[]).filter(
    (cat) => byCategory[cat]?.length
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fee Worksheet — Closing Cost Estimate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((cat) => (
          <div key={cat} className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABELS[cat]}
            </p>
            {byCategory[cat].map((fee, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{fee.label}</span>
                <span className="font-medium">{fmt(fee.amount)}</span>
              </div>
            ))}
          </div>
        ))}

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Closing Costs</span>
            <span>{fmt(totalClosingCosts)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Down Payment</span>
            <span>{fmt(downPayment)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
            <span>Estimated Cash to Close</span>
            <span>{fmt(cashToClose)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          * This is an estimate only. Actual fees may vary. Not a Loan Estimate or binding commitment.
        </p>
      </CardContent>
    </Card>
  );
}

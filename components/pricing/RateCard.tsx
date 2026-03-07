"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RateScenario } from "@/lib/utils/pricing-engine";
import { cn } from "@/lib/utils";

interface RateCardProps {
  scenario: RateScenario;
  selected?: boolean;
  onSelect?: () => void;
  loanAmount: number;
  miMonthly?: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function RateCard({ scenario, selected, onSelect, loanAmount, miMonthly = 0 }: RateCardProps) {
  const totalMonthly = scenario.monthlyPayment + miMonthly;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all border-2",
        selected ? "border-blue-600 bg-blue-50" : "border-transparent hover:border-slate-200"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{scenario.label}</span>
          <div className="flex gap-1">
            {scenario.isArm && <Badge variant="outline" className="text-xs">ARM</Badge>}
            {scenario.points > 0 && (
              <Badge variant="secondary" className="text-xs">{scenario.points} pts</Badge>
            )}
          </div>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-blue-700">{scenario.rate.toFixed(3)}%</span>
          <span className="text-muted-foreground text-sm mb-1">rate</span>
        </div>

        <div className="text-xs text-muted-foreground">APR {scenario.apr.toFixed(3)}%</div>

        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">P&I Payment</span>
            <span className="font-medium">{fmt(scenario.monthlyPayment)}/mo</span>
          </div>
          {miMonthly > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mortgage Insurance</span>
              <span className="font-medium">{fmt(miMonthly)}/mo</span>
            </div>
          )}
          {miMonthly > 0 && (
            <div className="flex justify-between border-t pt-1">
              <span className="font-medium">Total Monthly</span>
              <span className="font-bold">{fmt(totalMonthly)}/mo</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Interest</span>
            <span>{fmt(scenario.totalInterest)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

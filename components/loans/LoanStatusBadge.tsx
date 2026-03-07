import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/lib/types/loan.types";
import { LOAN_STATUS_LABELS } from "@/lib/types/loan.types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<LoanStatus, string> = {
  intake: "bg-slate-100 text-slate-700 border-slate-200",
  verification: "bg-yellow-50 text-yellow-700 border-yellow-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  in_underwriting: "bg-purple-50 text-purple-700 border-purple-200",
  conditional_approval: "bg-orange-50 text-orange-700 border-orange-200",
  clear_to_close: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  withdrawn: "bg-red-50 text-red-700 border-red-200",
};

interface LoanStatusBadgeProps {
  status: LoanStatus;
  className?: string;
}

export function LoanStatusBadge({ status, className }: LoanStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_COLORS[status], "font-medium", className)}
    >
      {LOAN_STATUS_LABELS[status]}
    </Badge>
  );
}

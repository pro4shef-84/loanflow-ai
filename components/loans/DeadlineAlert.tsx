import { AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deadlineColorClass, daysUntil, formatDate } from "@/lib/utils/date-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Deadline {
  loanId: string;
  borrowerName: string;
  deadlineType: "rate_lock" | "closing" | "condition";
  date: string;
  label: string;
}

interface DeadlineAlertProps {
  deadline: Deadline;
}

export function DeadlineAlert({ deadline }: DeadlineAlertProps) {
  const days = daysUntil(deadline.date);
  const colorClass = deadlineColorClass(deadline.date);
  const isUrgent = days !== null && days <= 3;

  return (
    <Link href={`/loans/${deadline.loanId}`}>
      <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", isUrgent && "border-red-200 bg-red-50/50")}>
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            {isUrgent ? (
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            ) : (
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">{deadline.borrowerName}</p>
              <p className="text-xs text-muted-foreground">{deadline.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-sm font-semibold", colorClass)}>
              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days !== null && days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(deadline.date)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

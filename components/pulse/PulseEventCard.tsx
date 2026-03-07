"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Clock } from "lucide-react";
import type { PulseEventWithContact } from "@/hooks/usePulse";
import { formatDate } from "@/lib/utils/date-utils";
import { cn } from "@/lib/utils";

const EVENT_TYPE_LABELS: Record<string, string> = {
  rate_drop: "Rate Drop",
  equity_trigger: "Equity Opportunity",
  loan_anniversary: "Loan Anniversary",
  listing_activity: "Listing Activity",
  manual: "Manual",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  rate_drop: "bg-blue-50 text-blue-700 border-blue-200",
  equity_trigger: "bg-green-50 text-green-700 border-green-200",
  loan_anniversary: "bg-purple-50 text-purple-700 border-purple-200",
  listing_activity: "bg-orange-50 text-orange-700 border-orange-200",
  manual: "bg-slate-50 text-slate-700 border-slate-200",
};

interface PulseEventCardProps {
  event: PulseEventWithContact;
  onNudge: (id: string) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}

export function PulseEventCard({ event, onNudge, onDismiss, onSnooze }: PulseEventCardProps) {
  const contact = event.contacts;
  const name = contact ? `${contact.first_name} ${contact.last_name}` : "Unknown";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">
              Detected {formatDate(event.detected_at)}
            </p>
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0", EVENT_TYPE_COLORS[event.event_type] ?? EVENT_TYPE_COLORS.manual)}>
            {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
          </Badge>
        </div>

        {event.reasoning && (
          <p className="text-sm text-muted-foreground">{event.reasoning}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="gap-1 flex-1" onClick={() => onNudge(event.id)}>
            <MessageSquare className="h-3 w-3" />
            Send Nudge
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => onSnooze(event.id)}>
            <Clock className="h-3 w-3" />
            Snooze
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDismiss(event.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

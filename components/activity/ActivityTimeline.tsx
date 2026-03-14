"use client";

import { useState } from "react";
import {
  ListChecks,
  Upload,
  Tag,
  ShieldCheck,
  XCircle,
  Replace,
  RefreshCw,
  AlertTriangle,
  Eye,
  CheckCircle,
  X,
  Bell,
  FileCheck,
  ShieldOff,
  Shield,
  PartyPopper,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeline } from "@/hooks/useTimeline";
import type { TypedFileCompletionEvent } from "@/hooks/useTimeline";
import type { FileCompletionEventType } from "@/lib/domain";
import { EVENT_TYPE_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  loanFileId: string;
}

const EVENT_ICONS: Record<FileCompletionEventType, typeof ListChecks> = {
  checklist_generated: ListChecks,
  borrower_invited: UserPlus,
  document_uploaded: Upload,
  document_classified: Tag,
  document_validated: ShieldCheck,
  document_rejected: XCircle,
  document_superseded: Replace,
  requirement_state_changed: RefreshCw,
  doc_workflow_transition: RefreshCw,
  escalation_created: AlertTriangle,
  escalation_acknowledged: Eye,
  escalation_resolved: CheckCircle,
  escalation_dismissed: X,
  reminder_sent: Bell,
  officer_review_submitted: FileCheck,
  officer_waived_requirement: ShieldOff,
  officer_confirmed_requirement: Shield,
  file_marked_complete: PartyPopper,
};

const EVENT_COLORS: Record<string, string> = {
  checklist_generated: "text-blue-500 bg-blue-50",
  borrower_invited: "text-blue-500 bg-blue-50",
  document_uploaded: "text-green-500 bg-green-50",
  document_classified: "text-purple-500 bg-purple-50",
  document_validated: "text-green-600 bg-green-50",
  document_rejected: "text-red-500 bg-red-50",
  document_superseded: "text-gray-500 bg-gray-50",
  requirement_state_changed: "text-blue-500 bg-blue-50",
  doc_workflow_transition: "text-blue-600 bg-blue-50",
  escalation_created: "text-orange-500 bg-orange-50",
  escalation_acknowledged: "text-amber-500 bg-amber-50",
  escalation_resolved: "text-green-500 bg-green-50",
  escalation_dismissed: "text-gray-500 bg-gray-50",
  reminder_sent: "text-amber-500 bg-amber-50",
  officer_review_submitted: "text-blue-600 bg-blue-50",
  officer_waived_requirement: "text-gray-500 bg-gray-50",
  officer_confirmed_requirement: "text-green-600 bg-green-50",
  file_marked_complete: "text-green-600 bg-green-50",
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActor(actor: string): string {
  if (actor === "system") return "System";
  if (actor === "officer") return "Loan Officer";
  if (actor === "borrower") return "Borrower";
  return actor;
}

function PayloadDetails({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload || Object.keys(payload).length === 0) return null;

  const entries = Object.entries(payload).filter(
    ([key]) => !["event_type", "actor"].includes(key)
  );
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.slice(0, 3).map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-xs font-normal">
          {key.replace(/_/g, " ")}: {String(value)}
        </Badge>
      ))}
    </div>
  );
}

export function ActivityTimeline({ loanFileId }: ActivityTimelineProps) {
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: events, isLoading } = useTimeline(loanFileId, visibleCount);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ListChecks className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.event_type] ?? RefreshCw;
              const colorClass = EVENT_COLORS[event.event_type] ?? "text-gray-500 bg-gray-50";
              const label =
                EVENT_TYPE_LABELS[event.event_type] ??
                event.event_type.replace(/_/g, " ");

              return (
                <div key={event.id} className="flex gap-3 relative">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 border",
                      colorClass
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium">{label}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatActor(event.actor)}</span>
                      <span>·</span>
                      <span>{formatTimestamp(event.created_at)}</span>
                    </div>
                    <PayloadDetails
                      payload={event.payload as Record<string, unknown> | null}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {events.length >= visibleCount && (
          <div className="text-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

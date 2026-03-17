"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Clock, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database.types";

type AuditEvent = Database["public"]["Tables"]["file_completion_events"]["Row"];

const EVENT_COLORS: Record<string, string> = {
  document_uploaded: "bg-blue-100 text-blue-700",
  document_classified: "bg-indigo-100 text-indigo-700",
  document_validated: "bg-green-100 text-green-700",
  document_superseded: "bg-slate-100 text-slate-600",
  requirement_state_changed: "bg-yellow-100 text-yellow-700",
  escalation_created: "bg-red-100 text-red-700",
  escalation_resolved: "bg-green-100 text-green-700",
  loan_imported: "bg-purple-100 text-purple-700",
  disclosure_signed: "bg-teal-100 text-teal-700",
  borrower_message_sent: "bg-cyan-100 text-cyan-700",
  underwriting_narrative_generated: "bg-violet-100 text-violet-700",
  condition_auto_resolved: "bg-emerald-100 text-emerald-700",
  review_submitted: "bg-orange-100 text-orange-700",
  default: "bg-slate-100 text-slate-600",
};

function eventLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function eventColor(type: string): string {
  return EVENT_COLORS[type] ?? EVENT_COLORS.default;
}

export default function AuditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery<AuditEvent[]>({
    queryKey: ["audit", id],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${id}/audit`);
      const data = await res.json() as { data?: AuditEvent[] };
      return data.data ?? [];
    },
  });

  const filtered = (events ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q) ||
      JSON.stringify(e.payload).toLowerCase().includes(q)
    );
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, AuditEvent[]>>((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground text-sm">Immutable event history for this loan file</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="pl-9"
        />
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm text-center py-8">Loading audit log...</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">No events found.</p>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {date}
              </h3>
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-0">
                {dayEvents.map((event) => (
                  <div key={event.id} className="relative pl-6 pb-4">
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    </div>

                    <div className="bg-white border rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eventColor(event.event_type)}`}>
                            {eventLabel(event.event_type)}
                          </span>
                          <span className="text-xs text-muted-foreground">by {event.actor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {event.payload && (
                            <button
                              onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {expandedId === event.id ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedId === event.id && event.payload && (
                        <pre className="text-xs bg-slate-50 border rounded p-2 overflow-auto max-h-40 text-slate-700">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

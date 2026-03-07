"use client";

import { useState } from "react";
import { usePulseEvents, useUpdatePulseEvent } from "@/hooks/usePulse";
import { PulseEventCard } from "@/components/pulse/PulseEventCard";
import { NudgeComposer } from "@/components/pulse/NudgeComposer";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

interface NudgeTarget {
  id: string;
  contactId: string;
  contactName: string;
  eventType: string;
}

export default function PulsePage() {
  const { data: events, isLoading } = usePulseEvents();
  const updatePulse = useUpdatePulseEvent();
  const [nudgeTarget, setNudgeTarget] = useState<NudgeTarget | null>(null);

  const handleNudge = (id: string) => {
    const event = events?.find((e) => e.id === id);
    if (!event?.contacts) return;
    setNudgeTarget({
      id,
      contactId: event.contact_id,
      contactName: `${event.contacts.first_name} ${event.contacts.last_name}`,
      eventType: event.event_type,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pulse</h1>
        <p className="text-muted-foreground">Past clients showing opportunity signals</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !events || events.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No pulse alerts right now</p>
            <p className="text-sm mt-1">
              Add past clients to Pulse monitoring and they&apos;ll appear here when opportunity signals are detected.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <PulseEventCard
              key={event.id}
              event={event}
              onNudge={handleNudge}
              onDismiss={(id) => updatePulse.mutate({ id, actionTaken: "dismissed" })}
              onSnooze={(id) => updatePulse.mutate({ id, actionTaken: "snoozed" })}
            />
          ))}
        </div>
      )}

      <Dialog open={!!nudgeTarget} onOpenChange={() => setNudgeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Nudge to {nudgeTarget?.contactName}</DialogTitle>
          </DialogHeader>
          {nudgeTarget && (
            <NudgeComposer
              contactId={nudgeTarget.contactId}
              contactName={nudgeTarget.contactName}
              eventType={nudgeTarget.eventType}
              onSent={() => {
                updatePulse.mutate({ id: nudgeTarget.id, actionTaken: "nudge_sent" });
                setNudgeTarget(null);
              }}
              onCancel={() => setNudgeTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

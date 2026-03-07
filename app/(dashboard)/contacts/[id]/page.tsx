"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/date-utils";
import type { Database } from "@/lib/types/database.types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type PulseEvent = Database["public"]["Tables"]["pulse_events"]["Row"];

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();

  const { data: contact } = useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Contact;
    },
  });

  const { data: pulseEvents } = useQuery({
    queryKey: ["pulse-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pulse_events")
        .select("*")
        .eq("contact_id", id)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data as PulseEvent[];
    },
  });

  if (!contact) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contacts"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{contact.first_name} {contact.last_name}</h1>
          <Badge variant="outline" className="capitalize">{contact.type}</Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{[contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {contact.type === "borrower" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Loan History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contact.property_value && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Value</span>
                  <span>{formatCurrency(contact.property_value)}</span>
                </div>
              )}
              {contact.loan_balance && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Balance</span>
                  <span>{formatCurrency(contact.loan_balance)}</span>
                </div>
              )}
              {contact.note_rate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Note Rate</span>
                  <span>{contact.note_rate}%</span>
                </div>
              )}
              {contact.loan_close_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Close Date</span>
                  <span>{formatDate(contact.loan_close_date)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {pulseEvents && pulseEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Pulse History</h2>
          <div className="space-y-2">
            {pulseEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{event.event_type.replace(/_/g, " ")}</p>
                    {event.reasoning && <p className="text-muted-foreground text-xs">{event.reasoning}</p>}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs capitalize">{event.action_taken}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(event.detected_at)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

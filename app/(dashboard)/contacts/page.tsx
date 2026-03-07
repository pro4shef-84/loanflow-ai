"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, User } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database.types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

const TYPE_COLORS = {
  borrower: "bg-blue-50 text-blue-700 border-blue-200",
  realtor: "bg-green-50 text-green-700 border-green-200",
  title: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function ContactsPage() {
  const supabase = createClient();
  const [search, setSearch] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const filtered = (contacts ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">{contacts?.length ?? 0} contacts</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No contacts found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-200 text-slate-600 text-sm">
                      {contact.first_name[0]}{contact.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{contact.email ?? contact.phone ?? "No contact info"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.pulse_active && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                        Pulse Active
                      </Badge>
                    )}
                    <Badge variant="outline" className={TYPE_COLORS[contact.type]}>
                      {contact.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

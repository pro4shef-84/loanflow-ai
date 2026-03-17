"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MessageLog } from "@/components/communications/MessageLog";
import { MessageComposer } from "@/components/communications/MessageComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

type Message = Database["public"]["Tables"]["messages"]["Row"];

function LOPortalMessageThread({
  messages,
  loanId,
  onSent,
}: {
  messages: Message[];
  loanId: string;
  onSent: () => void;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("messages").insert({
        loan_file_id: loanId,
        user_id: user.id,
        channel: "in_app" as const,
        direction: "outbound" as const,
        recipient_type: "borrower" as const,
        content: input.trim(),
        status: "sent" as const,
        sent_at: new Date().toISOString(),
      });
      setInput("");
      onSent();
    } finally {
      setSending(false);
    }
  };

  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-3">
      <div className="border rounded-lg h-64 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No portal messages yet.</p>
        )}
        {sorted.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                msg.direction === "outbound"
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-slate-800"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={cn(
                "text-[10px] mt-0.5",
                msg.direction === "outbound" ? "text-blue-200" : "text-slate-400"
              )}>
                {msg.direction === "inbound" ? "Borrower" : "You"} ·{" "}
                {new Date(msg.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }}}
          placeholder="Reply to borrower..."
          className="resize-none text-sm"
          rows={2}
        />
        <Button size="icon" onClick={send} disabled={!input.trim() || sending} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CommunicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("loan_file_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Communications</h1>
          <p className="text-muted-foreground text-sm">Messages and notifications</p>
        </div>
      </div>

      <Tabs defaultValue="portal">
        <TabsList>
          <TabsTrigger value="portal">
            Portal Messages ({messages?.filter((m) => m.channel === "in_app").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="log">All Messages ({messages?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="portal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Borrower Portal Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <LOPortalMessageThread messages={messages?.filter((m) => m.channel === "in_app") ?? []} loanId={id} onSent={() => queryClient.invalidateQueries({ queryKey: ["messages", id] })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <MessageLog messages={messages ?? []} />
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Send Message</CardTitle></CardHeader>
            <CardContent>
              <MessageComposer
                loanFileId={id}
                onSent={() => queryClient.invalidateQueries({ queryKey: ["messages", id] })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

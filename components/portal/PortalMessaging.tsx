"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  created_at: string;
  status: string | null;
}

interface PortalMessagingProps {
  token: string;
}

export function PortalMessaging({ token }: PortalMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portal/${token}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json() as { data?: Message };
      if (data.data) {
        setMessages((prev) => [...prev, data.data!]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-slate-50">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-sm">Message your Loan Officer</h3>
      </div>

      <div className="h-52 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <p className="text-center text-sm text-muted-foreground py-4">Loading messages...</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No messages yet. Send a message to your loan officer.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.direction === "inbound" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                msg.direction === "inbound"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-slate-100 text-slate-800 rounded-bl-sm"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={cn(
                "text-[10px] mt-0.5",
                msg.direction === "inbound" ? "text-blue-200" : "text-slate-400"
              )}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t px-3 py-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="resize-none min-h-[40px] max-h-[120px] text-sm"
          rows={1}
        />
        <Button
          size="icon"
          onClick={send}
          disabled={!input.trim() || sending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

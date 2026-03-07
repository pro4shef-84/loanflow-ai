"use client";

import { Mail, MessageSquare, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/lib/types/database.types";
import { formatDate } from "@/lib/utils/date-utils";
import { cn } from "@/lib/utils";

type Message = Database["public"]["Tables"]["messages"]["Row"];

interface MessageLogProps {
  messages: Message[];
}

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  approved: "bg-blue-50 text-blue-600",
  sending: "bg-yellow-50 text-yellow-600",
  sent: "bg-green-50 text-green-600",
  delivered: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-red-600",
};

export function MessageLog({ messages }: MessageLogProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className={cn("flex gap-3 p-3 rounded-lg border", msg.direction === "inbound" && "bg-slate-50")}>
          <div className="shrink-0 mt-0.5">
            {msg.channel === "email" ? (
              <Mail className="h-4 w-4 text-muted-foreground" />
            ) : (
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {msg.direction === "outbound" ? (
                  <ArrowUpRight className="h-3 w-3 text-blue-500" />
                ) : (
                  <ArrowDownLeft className="h-3 w-3 text-green-500" />
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {msg.channel} · {msg.recipient_type ?? "unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {msg.status && (
                  <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[msg.status])}>
                    {msg.status}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
              </div>
            </div>
            {msg.subject && <p className="text-sm font-medium mb-0.5">{msg.subject}</p>}
            <p className="text-sm text-muted-foreground line-clamp-3">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send } from "lucide-react";

interface NudgeComposerProps {
  contactId: string;
  contactName: string;
  eventType: string;
  onSent?: () => void;
  onCancel?: () => void;
}

export function NudgeComposer({ contactId, contactName, eventType, onSent, onCancel }: NudgeComposerProps) {
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: `Pulse outreach — ${eventType} trigger`,
          recipientType: "borrower",
          channel,
          tone: "friendly",
          specificInstructions: `Contact: ${contactName}. Event: ${eventType}.`,
        }),
      });
      const json = await res.json();
      if (json.data?.content) setMessage(json.data.content);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, channel, content: message }),
      });
      onSent?.();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Channel</Label>
        <Select value={channel} onValueChange={(v) => setChannel(v as "sms" | "email")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Message</Label>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles className="h-3 w-3" />
            {isGenerating ? "Generating..." : "AI Draft"}
          </Button>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message or use AI to draft one..."
          className="min-h-[120px]"
        />
        {channel === "sms" && (
          <p className="text-xs text-muted-foreground">{message.length}/160 characters</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSend} disabled={isSending || !message.trim()} className="gap-1">
          <Send className="h-3 w-3" />
          {isSending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}

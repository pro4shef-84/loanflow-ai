"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send } from "lucide-react";

interface MessageComposerProps {
  loanFileId?: string;
  contactId?: string;
  onSent?: () => void;
}

export function MessageComposer({ loanFileId, contactId, onSent }: MessageComposerProps) {
  const [channel, setChannel] = useState<"sms" | "email">("email");
  const [recipientType, setRecipientType] = useState("borrower");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "Loan status update",
          recipientType,
          channel,
          tone: "professional",
        }),
      });
      const json = await res.json();
      if (json.data?.content) setContent(json.data.content);
      if (json.data?.subject) setSubject(json.data.subject);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanFileId,
          contactId,
          channel,
          recipientType,
          subject,
          content,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setContent("");
      setSubject("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as "sms" | "email")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Select value={recipientType} onValueChange={setRecipientType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="borrower">Borrower</SelectItem>
              <SelectItem value="realtor">Realtor</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {channel === "email" && (
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Re: Your loan update" />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Message</Label>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles className="h-3 w-3" />
            {isGenerating ? "Drafting..." : "AI Draft"}
          </Button>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your message..."
          className="min-h-[120px]"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSend} disabled={isSending || !content.trim()} className="gap-2">
        <Send className="h-4 w-4" />
        {isSending ? "Sending..." : "Send Message"}
      </Button>
    </div>
  );
}

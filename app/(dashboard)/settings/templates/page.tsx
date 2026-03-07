"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  channel: "sms" | "email";
  content: string;
  subject?: string;
  trigger: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "1",
    name: "Document Request",
    channel: "sms",
    content: "Hi {first_name}, I need a few documents to keep your loan moving. I've sent you a secure link — it only takes 5 minutes. Let me know if you have any questions!",
    trigger: "document_needed",
  },
  {
    id: "2",
    name: "Rate Lock Reminder",
    channel: "email",
    subject: "Important: Your rate lock expires soon",
    content: "Hi {first_name},\n\nJust a heads up — your rate lock expires on {rate_lock_date}. I want to make sure we stay on track for your closing. Please reach out if you have any questions or if there are any delays.",
    trigger: "rate_lock_expiring",
  },
  {
    id: "3",
    name: "Conditional Approval",
    channel: "sms",
    content: "Great news, {first_name}! You've received a conditional approval. I'll send you the details shortly along with what we need to get to clear-to-close.",
    trigger: "conditional_approval",
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [editing, setEditing] = useState<Template | null>(null);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Message Templates</h1>
            <p className="text-muted-foreground text-sm">Pre-written messages for common scenarios</p>
          </div>
        </div>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{template.name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{template.channel}</Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">{template.trigger.replace(/_/g, " ")}</Badge>
                  </div>
                  {template.subject && (
                    <p className="text-xs text-muted-foreground mb-1">Subject: {template.subject}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.content}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(template)}>Edit</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setTemplates(templates.filter((t) => t.id !== template.id))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

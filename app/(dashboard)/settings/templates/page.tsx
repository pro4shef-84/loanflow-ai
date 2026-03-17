"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Pencil, Copy, Check } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database.types";

type Template = Database["public"]["Tables"]["message_templates"]["Row"];

const CATEGORY_LABELS: Record<string, string> = {
  documents: "Documents",
  status: "Status Updates",
  urgent: "Urgent",
  general: "General",
};

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-green-100 text-green-700",
  email: "bg-blue-100 text-blue-700",
  both: "bg-purple-100 text-purple-700",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? "/api/templates" : `/api/templates/${editing.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          category: editing.category ?? "general",
          channel: editing.channel ?? "both",
          subject: editing.subject ?? null,
          body: editing.body ?? "",
        }),
      });
      const data = await res.json() as { data?: Template };
      if (data.data) {
        setTemplates((prev) =>
          isNew
            ? [data.data!, ...prev]
            : prev.map((t) => (t.id === data.data!.id ? data.data! : t))
        );
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const copyBody = (template: Template) => {
    navigator.clipboard.writeText(template.body).then(() => {
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Group by category
  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category ?? "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Message Templates</h1>
            <p className="text-muted-foreground text-sm">Pre-written messages with variable substitution</p>
          </div>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setEditing({ channel: "email", category: "general" })}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading templates...</p>}

      {!loading && templates.length === 0 && (
        <p className="text-muted-foreground text-sm">No templates yet. Create your first template above.</p>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          {items.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-medium text-sm">{template.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CHANNEL_COLORS[template.channel]}`}>
                        {template.channel}
                      </span>
                      {template.is_default && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                    {template.subject && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Subject: <em>{template.subject}</em>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.body}</p>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map((v) => (
                          <code key={v} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyBody(template)}>
                      {copiedId === template.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(template)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {/* Edit/Create Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Missing Document Request"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={editing?.channel ?? "email"}
                  onValueChange={(v) => setEditing((prev) => ({ ...prev, channel: v as Template["channel"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editing?.category ?? "general"}
                  onValueChange={(v) => setEditing((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="status">Status Updates</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(editing?.channel === "email" || editing?.channel === "both") && (
              <div className="space-y-1.5">
                <Label>Email Subject</Label>
                <Input
                  value={editing?.subject ?? ""}
                  onChange={(e) => setEditing((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Action Required: Documents Needed"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                Message Body
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  (use {`{{variable}}`} for substitution)
                </span>
              </Label>
              <Textarea
                value={editing?.body ?? ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, body: e.target.value }))}
                placeholder={`Hi {{borrower_name}},\n\nYour loan is...`}
                className="min-h-[140px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !editing?.name || !editing?.body}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

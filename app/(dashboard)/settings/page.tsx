"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils/date-utils";
import Link from "next/link";

interface AiUsage {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  totalCostUsd: number;
  tier: string;
}

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nmlsId, setNmlsId] = useState(profile?.nmls_id ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);

  useEffect(() => {
    fetch("/api/user/ai-usage")
      .then((r) => r.json())
      .then((d) => setAiUsage(d.data ?? null))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    await supabase.from("users").update({ full_name: fullName, nmls_id: nmlsId, phone }).eq("id", user.id);
    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and license information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NMLS ID</Label>
                <Input value={nmlsId} onChange={(e) => setNmlsId(e.target.value)} placeholder="1234567" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <Button type="submit" disabled={isSaving}>
              {saved ? "Saved!" : isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{profile?.subscription_tier ?? "trial"} Plan</p>
              {profile?.subscription_tier === "trial" && (
                <p className="text-sm text-muted-foreground">
                  Trial ends {formatDate(profile.trial_ends_at)}
                </p>
              )}
            </div>
            <Badge variant="outline" className="capitalize">{profile?.subscription_tier}</Badge>
          </div>
          <Separator />
          <Button asChild>
            <Link href="/settings/billing">Manage Billing</Link>
          </Button>
        </CardContent>
      </Card>

      {aiUsage && (
        <Card>
          <CardHeader>
            <CardTitle>AI Usage This Month</CardTitle>
            <CardDescription>
              Resets {new Date(aiUsage.resetAt).toLocaleDateString([], { month: "long", day: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {aiUsage.used.toLocaleString()} / {aiUsage.limit.toLocaleString()} tokens
              </span>
              <span className="text-muted-foreground">
                ${aiUsage.totalCostUsd.toFixed(4)} cost
              </span>
            </div>
            <Progress
              value={(aiUsage.used / aiUsage.limit) * 100}
              className="h-2"
            />
            {aiUsage.remaining === 0 && (
              <p className="text-xs text-red-600">
                Monthly limit reached. Upgrade your plan for more AI capacity.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Button asChild variant="outline">
          <Link href="/settings/templates">Message Templates</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/import">Import from ARIVE</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/health">System Health</Link>
        </Button>
      </div>
    </div>
  );
}

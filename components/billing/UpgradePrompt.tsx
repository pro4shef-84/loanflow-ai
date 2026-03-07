"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UpgradePromptProps {
  variant?: "banner" | "card";
}

export function UpgradePrompt({ variant = "card" }: UpgradePromptProps) {
  const [show, setShow] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [tier, setTier] = useState<string>("trial");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("subscription_tier, trial_ends_at").eq("id", user.id).single()
        .then(({ data }) => {
          if (!data) return;
          setTier(data.subscription_tier);
          if (data.subscription_tier === "trial") {
            const trialEnd = new Date(data.trial_ends_at);
            const now = new Date();
            const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setDaysLeft(Math.max(0, days));
            setShow(true);
          }
        });
    });
  }, []);

  if (!show || dismissed) return null;

  const isExpired = daysLeft === 0;
  const isUrgent = daysLeft !== null && daysLeft <= 3;

  if (variant === "banner") {
    return (
      <div className={`flex items-center justify-between px-4 py-2 text-sm ${isExpired ? "bg-red-600 text-white" : isUrgent ? "bg-orange-500 text-white" : "bg-blue-600 text-white"}`}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          {isExpired
            ? "Your trial has ended. Upgrade to continue."
            : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your trial.`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href="/settings/billing">Upgrade Now</Link>
          </Button>
          {!isExpired && (
            <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-2 ${isExpired ? "border-red-300 bg-red-50" : "border-blue-300 bg-blue-50"}`}>
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Zap className={`h-5 w-5 ${isExpired ? "text-red-600" : "text-blue-600"}`} />
          <div>
            <p className="font-semibold text-sm">
              {isExpired ? "Trial Expired" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in trial`}
            </p>
            <p className="text-xs text-muted-foreground">
              {isExpired
                ? "Upgrade to regain full access to LoanFlow AI."
                : "Upgrade for unlimited loans, AUS, lender submission & more."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" asChild className={isExpired ? "bg-red-600 hover:bg-red-700" : ""}>
            <Link href="/settings/billing">
              <Zap className="h-3 w-3 mr-1" />
              Upgrade
            </Link>
          </Button>
          {!isExpired && (
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

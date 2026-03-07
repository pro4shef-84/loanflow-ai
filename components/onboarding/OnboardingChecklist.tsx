"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  cta: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "profile",
    label: "Complete your profile",
    description: "Add your name, phone, and NMLS ID",
    href: "/settings",
    cta: "Go to Settings",
  },
  {
    id: "first_loan",
    label: "Create your first loan file",
    description: "Start a new loan and auto-generate a document checklist",
    href: "/loans/new",
    cta: "Create Loan",
  },
  {
    id: "pricing",
    label: "Run a rate quote",
    description: "Use the Pricing Engine to quote a borrower",
    href: "/pricing",
    cta: "Open Pricing",
  },
  {
    id: "contact",
    label: "Add a contact",
    description: "Add a borrower or realtor to your CRM",
    href: "/contacts",
    cta: "Add Contact",
  },
  {
    id: "portal",
    label: "Share a borrower portal",
    description: "Send a borrower their document upload link",
    href: "/loans",
    cta: "View Loans",
  },
];

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [hasLoans, setHasLoans] = useState(false);
  const [hasContacts, setHasContacts] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const dismissed = localStorage.getItem("onboarding_dismissed");
    if (dismissed) { setDismissed(true); setLoaded(true); return; }

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: loans }, { data: contacts }] = await Promise.all([
        supabase.from("users").select("full_name, nmls_id").eq("id", user.id).single(),
        supabase.from("loan_files").select("id").eq("user_id", user.id).limit(1),
        supabase.from("contacts").select("id").eq("user_id", user.id).limit(1),
      ]);

      const done = new Set<string>();
      if (profile?.full_name && profile?.nmls_id) done.add("profile");
      if (loans && loans.length > 0) { done.add("first_loan"); done.add("portal"); }
      if (contacts && contacts.length > 0) done.add("contact");
      setHasLoans((loans?.length ?? 0) > 0);
      setHasContacts((contacts?.length ?? 0) > 0);
      setCompleted(done);
      setLoaded(true);
    };
    check();
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("onboarding_dismissed", "true");
    setDismissed(true);
  };

  if (!loaded || dismissed) return null;
  if (completed.size === STEPS.length) return null;

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Getting Started</CardTitle>
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              {completed.size}/{STEPS.length} complete
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-1.5 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2">
        {STEPS.map((step) => {
          const done = completed.has(step.id);
          return (
            <div
              key={step.id}
              className={`flex items-center justify-between p-2.5 rounded-lg ${done ? "opacity-50" : "bg-white border"}`}
            >
              <div className="flex items-center gap-3">
                {done
                  ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  : <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                }
                <div>
                  <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{step.label}</p>
                  {!done && <p className="text-xs text-muted-foreground">{step.description}</p>}
                </div>
              </div>
              {!done && (
                <Button variant="ghost" size="sm" className="gap-1 text-blue-700 hover:text-blue-800" asChild>
                  <Link href={step.href}>
                    {step.cta}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

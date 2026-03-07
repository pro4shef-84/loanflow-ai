"use client";

import { PLANS } from "@/lib/stripe/plans";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { profile } = useAuth();
  const currentTier = profile?.subscription_tier ?? "trial";

  const handleSubscribe = async (tier: string) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Choose the right plan for your pipeline</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(PLANS).map(([tier, plan]) => {
          const isCurrentPlan = currentTier === tier;
          const isPro = tier === "pro";

          return (
            <Card key={tier} className={cn("relative", isPro && "border-blue-500 shadow-md")}>
              {isPro && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isPro ? "default" : "outline"}
                  disabled={isCurrentPlan}
                  onClick={() => handleSubscribe(tier)}
                >
                  {isCurrentPlan ? "Current Plan" : "Upgrade"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

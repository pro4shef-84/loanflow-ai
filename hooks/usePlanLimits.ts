"use client";

import { useAuth } from "@/hooks/useAuth";
import { canAccess, getLoanFileLimit, getSeatLimit } from "@/lib/stripe/plan-limits";
import type { FeatureKey } from "@/lib/stripe/plan-limits";

export function usePlanLimits() {
  const { profile } = useAuth();
  const tier = profile?.subscription_tier ?? "trial";

  return {
    tier,
    can: (feature: FeatureKey) => canAccess(tier, feature),
    loanFileLimit: getLoanFileLimit(tier),
    seatLimit: getSeatLimit(tier),
    isTrialing: tier === "trial",
    isPro: tier === "pro" || tier === "team",
    isTeam: tier === "team",
  };
}

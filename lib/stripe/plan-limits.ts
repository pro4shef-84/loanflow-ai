import { PLANS, type PlanTier } from "@/lib/stripe/plans";

export type FeatureKey =
  | "verify_ai"
  | "condition_tracker"
  | "pulse"
  | "readiness_score"
  | "arive_import"
  | "manager_dashboard"
  | "shared_pipeline"
  | "underwriting_narrative"
  | "team_seats";

const FEATURE_GATES: Record<FeatureKey, PlanTier[]> = {
  verify_ai: ["pro", "team"],
  condition_tracker: ["pro", "team"],
  pulse: ["pro", "team"],
  readiness_score: ["pro", "team"],
  arive_import: ["pro", "team"],
  underwriting_narrative: ["pro", "team"],
  manager_dashboard: ["team"],
  shared_pipeline: ["team"],
  team_seats: ["team"],
};

export function canAccess(tier: string, feature: FeatureKey): boolean {
  const allowed = FEATURE_GATES[feature];
  return allowed.includes(tier as PlanTier);
}

export function getLoanFileLimit(tier: string): number | null {
  const plan = PLANS[tier as PlanTier];
  return plan?.loanFileLimit ?? 0;
}

export function getSeatLimit(tier: string): number {
  const plan = PLANS[tier as PlanTier];
  return plan?.seats ?? 1;
}

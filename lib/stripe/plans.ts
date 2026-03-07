export const PLANS = {
  starter: {
    name: "Starter",
    price: 149,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "Up to 8 active loan files",
      "Intake AI",
      "Document Chase",
      "Borrower Portal",
      "Status Broadcaster",
    ],
    loanFileLimit: 8,
    seats: 1,
  },
  pro: {
    name: "Pro",
    price: 299,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "Unlimited loan files",
      "All Starter features",
      "Verify AI",
      "Condition Tracker",
      "Pulse + Nudge",
      "Readiness Score",
      "ARIVE Import",
    ],
    loanFileLimit: null,
    seats: 1,
  },
  team: {
    name: "Team",
    price: 499,
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    features: [
      "3 LO seats",
      "All Pro features",
      "Manager dashboard",
      "Shared pipeline",
    ],
    loanFileLimit: null,
    seats: 3,
  },
} as const;

export type PlanTier = keyof typeof PLANS;

export function getPlanByTier(tier: string) {
  if (tier in PLANS) return PLANS[tier as PlanTier];
  return null;
}

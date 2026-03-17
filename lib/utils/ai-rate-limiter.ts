// ============================================================
// AI RATE LIMITER
// Per-user monthly token budget enforcement.
// Uses the token_usage table (already populated by all AI routes).
// Blocks AI calls if a user exceeds their plan's monthly limit.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Monthly token budgets per plan (input + output tokens combined)
const MONTHLY_TOKEN_BUDGETS: Record<string, number> = {
  trial: 50_000,       // ~$0.015 at Gemini Flash pricing
  starter: 500_000,    // ~$0.15
  pro: 2_500_000,      // ~$0.75
  team: 10_000_000,    // ~$3.00
};

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string; // ISO date of first day of next month
}

export async function checkAiRateLimit(
  db: SupabaseClient<Database>,
  userId: string,
  tier: string
): Promise<RateLimitResult> {
  const limit = MONTHLY_TOKEN_BUDGETS[tier] ?? MONTHLY_TOKEN_BUDGETS.trial;

  // Get start of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get next month start for reset info
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetAt = nextMonth.toISOString();

  // Sum tokens used this month from token_usage table
  const { data, error } = await db
    .from("token_usage")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (error) {
    // On DB error, allow the request (fail open)
    console.error("[ai-rate-limiter] DB error:", error.message);
    return { allowed: true, used: 0, limit, remaining: limit, resetAt };
  }

  const used = (data ?? []).reduce(
    (sum, row) => sum + (row.input_tokens ?? 0) + (row.output_tokens ?? 0),
    0
  );

  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
    resetAt,
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  return {
    error: `Monthly AI token limit reached (${result.used.toLocaleString()} / ${result.limit.toLocaleString()} tokens). Resets ${new Date(result.resetAt).toLocaleDateString()}.`,
    rate_limit: result,
  };
}

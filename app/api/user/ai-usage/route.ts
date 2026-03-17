import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/types/api.types";
import { checkAiRateLimit } from "@/lib/utils/ai-rate-limiter";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "trial";
  const rateLimit = await checkAiRateLimit(supabase, user.id, tier);

  // Also get breakdown by module this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: byModule } = await supabase
    .from("token_usage")
    .select("module, input_tokens, output_tokens, cost_usd")
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  const moduleBreakdown = (byModule ?? []).reduce<Record<string, { tokens: number; cost: number }>>((acc, row) => {
    const mod = row.module;
    if (!acc[mod]) acc[mod] = { tokens: 0, cost: 0 };
    acc[mod].tokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
    acc[mod].cost += row.cost_usd ?? 0;
    return acc;
  }, {});

  const totalCost = (byModule ?? []).reduce((sum, row) => sum + (row.cost_usd ?? 0), 0);

  return NextResponse.json(successResponse({
    ...rateLimit,
    tier,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    moduleBreakdown,
  }));
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flashModel, extractJson } from "@/lib/ai/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildDraftMessagePrompt } from "@/lib/anthropic/prompts/draft-message";
import type { DraftMessageParams } from "@/lib/anthropic/prompts/draft-message";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { checkAiRateLimit, rateLimitResponse } from "@/lib/utils/ai-rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const { data: profile } = await supabase.from("users").select("subscription_tier").eq("id", user.id).single();
    const rateLimit = await checkAiRateLimit(supabase, user.id, profile?.subscription_tier ?? "trial");
    if (!rateLimit.allowed) return NextResponse.json(rateLimitResponse(rateLimit), { status: 429 });

    const body = await request.json() as DraftMessageParams;
    const { purpose, recipientType, channel, tone, loanContext, specificInstructions } = body;

    if (!purpose || !recipientType || !channel) {
      return NextResponse.json(errorResponse("purpose, recipientType, and channel are required"), { status: 400 });
    }

    const model = getModelForTask("draft-status-message");
    const prompt = buildDraftMessagePrompt({ purpose, recipientType, channel, tone: tone ?? "professional", loanContext, specificInstructions });

    const result = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = JSON.parse(extractJson(text));

    const usage = result.response.usageMetadata;
    await trackTokenUsage({
      userId: user.id,
      module: "draft-message",
      model,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      costUsd: estimateCost("draft-status-message", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[draft-message]", err);
    return NextResponse.json(errorResponse("Message drafting failed"), { status: 500 });
  }
}

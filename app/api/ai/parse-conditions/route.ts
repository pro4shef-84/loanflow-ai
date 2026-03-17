import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { proModel, extractJson } from "@/lib/ai/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildParseConditionsPrompt } from "@/lib/anthropic/prompts/parse-conditions";
import { ParseConditionsResponseSchema } from "@/lib/anthropic/schemas/condition-parse";
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

    const body = await request.json();
    const { loanFileId, conditionText } = body;

    if (!loanFileId || !conditionText) {
      return NextResponse.json(errorResponse("loanFileId and conditionText required"), { status: 400 });
    }

    const model = getModelForTask("parse-conditions");
    const prompt = buildParseConditionsPrompt(conditionText);

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = ParseConditionsResponseSchema.parse(JSON.parse(extractJson(text)));

    // Insert conditions into database
    const conditionInserts = parsed.conditions.map((c) => ({
      loan_file_id: loanFileId,
      source: "lender" as const,
      lender_condition_text: c.lender_condition_text,
      plain_english_summary: c.plain_english_summary,
      required_document_type: c.required_document_type,
      priority: c.priority,
      status: "open" as const,
    }));

    await supabase.from("conditions").insert(conditionInserts);

    const usage = result.response.usageMetadata;
    await trackTokenUsage({
      userId: user.id,
      loanFileId,
      module: "parse-conditions",
      model,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      costUsd: estimateCost("parse-conditions", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
    });

    return NextResponse.json(successResponse({ count: parsed.conditions.length, conditions: parsed.conditions }));
  } catch (err) {
    console.error("[parse-conditions]", err);
    return NextResponse.json(errorResponse("Condition parsing failed"), { status: 500 });
  }
}

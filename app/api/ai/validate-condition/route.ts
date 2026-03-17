import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { proModel, extractJson } from "@/lib/ai/client";
import type { Database } from "@/lib/types/database.types";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildValidateConditionPrompt } from "@/lib/anthropic/prompts/validate-condition";
import { maskObject } from "@/lib/utils/pii-masker";
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
    const { conditionId, documentId } = body;

    if (!conditionId || !documentId) {
      return NextResponse.json(errorResponse("conditionId and documentId required"), { status: 400 });
    }

    const [conditionResult, documentResult] = await Promise.all([
      supabase.from("conditions").select("*").eq("id", conditionId).single(),
      supabase.from("documents").select("*").eq("id", documentId).single(),
    ]);

    if (!conditionResult.data || !documentResult.data) {
      return NextResponse.json(errorResponse("Condition or document not found"), { status: 404 });
    }

    const condData = conditionResult.data as Database["public"]["Tables"]["conditions"]["Row"];
    const docData = documentResult.data as Database["public"]["Tables"]["documents"]["Row"];
    const maskedDocData = maskObject(docData.extracted_data);
    const model = getModelForTask("validate-condition");
    const prompt = buildValidateConditionPrompt(
      condData.lender_condition_text ?? condData.plain_english_summary ?? "",
      maskedDocData
    );

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = JSON.parse(extractJson(text));

    // Update condition status if satisfied
    if (parsed.satisfied) {
      await supabase
        .from("conditions")
        .update({ status: "validated", document_id: documentId, validated_at: new Date().toISOString() })
        .eq("id", conditionId);
    }

    const usage = result.response.usageMetadata;
    await trackTokenUsage({
      userId: user.id,
      module: "validate-condition",
      model,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      costUsd: estimateCost("validate-condition", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[validate-condition]", err);
    return NextResponse.json(errorResponse("Validation failed"), { status: 500 });
  }
}

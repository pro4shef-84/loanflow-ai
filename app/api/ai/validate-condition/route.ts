import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import type { Database } from "@/lib/types/database.types";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildValidateConditionPrompt } from "@/lib/anthropic/prompts/validate-condition";
import { maskObject } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

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

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(text);

    // Update condition status if satisfied
    if (parsed.satisfied) {
      await supabase
        .from("conditions")
        .update({ status: "validated", document_id: documentId, validated_at: new Date().toISOString() })
        .eq("id", conditionId);
    }

    await trackTokenUsage({
      userId: user.id,
      module: "validate-condition",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost("validate-condition", response.usage.input_tokens, response.usage.output_tokens),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[validate-condition]", err);
    return NextResponse.json(errorResponse("Validation failed"), { status: 500 });
  }
}

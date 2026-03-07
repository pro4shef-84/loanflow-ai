import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildParseConditionsPrompt } from "@/lib/anthropic/prompts/parse-conditions";
import { ParseConditionsResponseSchema } from "@/lib/anthropic/schemas/condition-parse";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const body = await request.json();
    const { loanFileId, conditionText } = body;

    if (!loanFileId || !conditionText) {
      return NextResponse.json(errorResponse("loanFileId and conditionText required"), { status: 400 });
    }

    const model = getModelForTask("parse-conditions");
    const prompt = buildParseConditionsPrompt(conditionText);

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = ParseConditionsResponseSchema.parse(JSON.parse(text));

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

    await trackTokenUsage({
      userId: user.id,
      loanFileId,
      module: "parse-conditions",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost("parse-conditions", response.usage.input_tokens, response.usage.output_tokens),
    });

    return NextResponse.json(successResponse({ count: parsed.conditions.length, conditions: parsed.conditions }));
  } catch (err) {
    console.error("[parse-conditions]", err);
    return NextResponse.json(errorResponse("Condition parsing failed"), { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildDraftMessagePrompt } from "@/lib/anthropic/prompts/draft-message";
import type { DraftMessageParams } from "@/lib/anthropic/prompts/draft-message";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const body = await request.json() as DraftMessageParams;
    const { purpose, recipientType, channel, tone, loanContext, specificInstructions } = body;

    if (!purpose || !recipientType || !channel) {
      return NextResponse.json(errorResponse("purpose, recipientType, and channel are required"), { status: 400 });
    }

    const model = getModelForTask("draft-status-message");
    const prompt = buildDraftMessagePrompt({ purpose, recipientType, channel, tone: tone ?? "professional", loanContext, specificInstructions });

    const response = await anthropic.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(text);

    await trackTokenUsage({
      userId: user.id,
      module: "draft-message",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost("draft-status-message", response.usage.input_tokens, response.usage.output_tokens),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[draft-message]", err);
    return NextResponse.json(errorResponse("Message drafting failed"), { status: 500 });
  }
}

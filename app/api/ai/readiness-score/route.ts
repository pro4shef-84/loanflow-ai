import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildReadinessScorePrompt } from "@/lib/anthropic/prompts/readiness-score";
import { ReadinessScoreSchema } from "@/lib/anthropic/schemas/readiness-score";
import { maskObject } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const body = await request.json();
    const { loanFileId } = body;
    if (!loanFileId) return NextResponse.json(errorResponse("loanFileId required"), { status: 400 });

    const { data: loan } = await supabase
      .from("loan_files")
      .select("*, documents(*), conditions(*), contacts(*)")
      .eq("id", loanFileId)
      .single();

    if (!loan) return NextResponse.json(errorResponse("Loan not found"), { status: 404 });

    const maskedData = maskObject(loan);
    const model = getModelForTask("readiness-score");
    const prompt = buildReadinessScorePrompt(maskedData);

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = ReadinessScoreSchema.parse(JSON.parse(text));

    // Save to loan file
    await serviceClient
      .from("loan_files")
      .update({
        submission_readiness_score: parsed.score,
        readiness_breakdown: parsed as unknown as import("@/lib/types/database.types").Json,
      })
      .eq("id", loanFileId);

    await trackTokenUsage({
      userId: user.id,
      loanFileId,
      module: "readiness-score",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost("readiness-score", response.usage.input_tokens, response.usage.output_tokens),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[readiness-score]", err);
    return NextResponse.json(errorResponse("Score calculation failed"), { status: 500 });
  }
}

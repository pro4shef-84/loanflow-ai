import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { proModel, extractJson } from "@/lib/ai/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildCalculateIncomePrompt } from "@/lib/anthropic/prompts/calculate-income";
import { IncomeCalculationSchema } from "@/lib/anthropic/schemas/income-calculation";
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

    // Rate limit check
    const { data: profile } = await supabase.from("users").select("subscription_tier").eq("id", user.id).single();
    const rateLimit = await checkAiRateLimit(supabase, user.id, profile?.subscription_tier ?? "trial");
    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimitResponse(rateLimit), { status: 429 });
    }

    const body = await request.json();
    const { loanFileId } = body;
    if (!loanFileId) return NextResponse.json(errorResponse("loanFileId required"), { status: 400 });

    // Fetch income documents
    const { data: documents } = await supabase
      .from("documents")
      .select("type, extracted_data, extraction_confidence")
      .eq("loan_file_id", loanFileId)
      .in("type", ["w2", "pay_stub", "tax_return_1040", "schedule_c", "schedule_e"])
      .eq("status", "verified");

    if (!documents || documents.length === 0) {
      return NextResponse.json(errorResponse("No verified income documents found"), { status: 400 });
    }

    const maskedDocuments = maskObject(documents);
    const model = getModelForTask("income-calculation");
    const prompt = buildCalculateIncomePrompt(maskedDocuments as unknown[]);

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = IncomeCalculationSchema.parse(JSON.parse(extractJson(text)));

    const usage = result.response.usageMetadata;
    await trackTokenUsage({
      userId: user.id,
      loanFileId,
      module: "calculate-income",
      model,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      costUsd: estimateCost("income-calculation", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[calculate-income]", err);
    return NextResponse.json(errorResponse("Income calculation failed"), { status: 500 });
  }
}

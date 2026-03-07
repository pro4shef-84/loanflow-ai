import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildCalculateIncomePrompt } from "@/lib/anthropic/prompts/calculate-income";
import { IncomeCalculationSchema } from "@/lib/anthropic/schemas/income-calculation";
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

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = IncomeCalculationSchema.parse(JSON.parse(text));

    await trackTokenUsage({
      userId: user.id,
      loanFileId,
      module: "calculate-income",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost("income-calculation", response.usage.input_tokens, response.usage.output_tokens),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[calculate-income]", err);
    return NextResponse.json(errorResponse("Income calculation failed"), { status: 500 });
  }
}

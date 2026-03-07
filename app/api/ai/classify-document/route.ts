import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildClassifyPrompt } from "@/lib/anthropic/prompts/classify-document";
import { DocumentClassificationSchema } from "@/lib/anthropic/schemas/document-extraction";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const body = await request.json();
    const { documentId, filename, textSnippet } = body;

    if (!documentId) return NextResponse.json(errorResponse("documentId required"), { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();

    const model = getModelForTask("classify-document");
    const prompt = buildClassifyPrompt(filename ?? "unknown", textSnippet);

    const response = await anthropic.messages.create({
      model,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = DocumentClassificationSchema.parse(JSON.parse(text));

    // Update document type if confidence is high
    if (parsed.confidence >= 0.8) {
      await serviceClient
        .from("documents")
        .update({ type: parsed.type as "other", status: "processing" })
        .eq("id", documentId);
    }

    // Track token usage
    if (user) {
      await trackTokenUsage({
        userId: user.id,
        module: "classify-document",
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        costUsd: estimateCost("classify-document", response.usage.input_tokens, response.usage.output_tokens),
      });
    }

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[classify-document]", err);
    return NextResponse.json(errorResponse("Classification failed"), { status: 500 });
  }
}

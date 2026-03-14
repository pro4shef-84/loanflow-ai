import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { flashModel, extractJson } from "@/lib/ai/client";
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

    const result = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = DocumentClassificationSchema.parse(JSON.parse(extractJson(text)));

    // Update document type if confidence is high
    if (parsed.confidence >= 0.8) {
      await serviceClient
        .from("documents")
        .update({ type: parsed.type as "other", status: "processing" })
        .eq("id", documentId);
    }

    // Track token usage
    const usage = result.response.usageMetadata;
    if (user) {
      await trackTokenUsage({
        userId: user.id,
        module: "classify-document",
        model,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        costUsd: estimateCost("classify-document", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
      });
    }

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[classify-document]", err);
    return NextResponse.json(errorResponse("Classification failed"), { status: 500 });
  }
}

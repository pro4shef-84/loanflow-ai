import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { flashModel, extractJson } from "@/lib/ai/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildExtractDocumentPrompt } from "@/lib/anthropic/prompts/extract-document";
import { DocumentExtractionSchema } from "@/lib/anthropic/schemas/document-extraction";
import { maskPii } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const body = await request.json();
    const { documentId, documentText } = body;

    if (!documentId || !documentText) {
      return NextResponse.json(errorResponse("documentId and documentText required"), { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: doc } = await supabase
      .from("documents")
      .select("type, loan_file_id")
      .eq("id", documentId)
      .single();

    if (!doc) return NextResponse.json(errorResponse("Document not found"), { status: 404 });

    const model = getModelForTask("classify-document"); // flash for extraction
    const maskedText = maskPii(documentText);
    const prompt = buildExtractDocumentPrompt(doc.type, maskedText);

    const result = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const rawParsed = JSON.parse(extractJson(text));
    const parsed = DocumentExtractionSchema.parse(rawParsed);

    await serviceClient
      .from("documents")
      .update({
        extracted_data: parsed as unknown as import("@/lib/types/database.types").Json,
        extraction_confidence: parsed.confidence,
        verification_flags: parsed.flags as unknown as import("@/lib/types/database.types").Json,
        status: "processing",
      })
      .eq("id", documentId);

    const usage = result.response.usageMetadata;
    if (user) {
      await trackTokenUsage({
        userId: user.id,
        loanFileId: doc.loan_file_id,
        module: "extract-document",
        model,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        costUsd: estimateCost("classify-document", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
      });
    }

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[extract-document]", err);
    return NextResponse.json(errorResponse("Extraction failed"), { status: 500 });
  }
}

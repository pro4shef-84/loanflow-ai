import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";
import { flashModel, MODELS, extractJson } from "@/lib/ai/client";
import { buildClassifyPrompt } from "@/lib/anthropic/prompts/classify-document";
import { validateDocument } from "@/lib/domain/rules/documentValidationRules";
import { buildExtractDocumentPrompt } from "@/lib/anthropic/prompts/extract-document";
import { CONFIDENCE_THRESHOLD, type RequiredDocType } from "@/lib/domain/enums";
import type { ExtractedFields } from "@/lib/domain/rules/documentValidationRules";
import type { Json } from "@/lib/types/database.types";
import { ConditionAutoResolver } from "@/lib/agents/conditionAutoResolver";

type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];
type DocRow = Database["public"]["Tables"]["documents"]["Row"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const loanFileId = formData.get("loanFileId") as string;
  const documentType = formData.get("documentType") as string | null;
  const requirementId = formData.get("requirementId") as string | null;

  if (!file || !loanFileId) {
    return NextResponse.json(errorResponse("Missing file or loanFileId"), { status: 400 });
  }

  // Verify ownership
  const { data: loan } = await supabase
    .from("loan_files")
    .select("id")
    .eq("id", loanFileId)
    .eq("user_id", user.id)
    .single();
  if (!loan) return NextResponse.json(errorResponse("Loan not found"), { status: 404 });

  // Upload file to Supabase Storage
  const serviceClient = await createServiceClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${user.id}/${loanFileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("loan-documents")
    .upload(path, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json(errorResponse(uploadError.message), { status: 500 });
  }

  // Create document record
  const { data: existingDoc } = await supabase
    .from("documents")
    .select("id")
    .eq("loan_file_id", loanFileId)
    .eq("type", (documentType ?? "other") as DocumentType)
    .eq("status", "pending")
    .single();

  let doc: DocRow | null = null;
  if (existingDoc) {
    const { data, error } = await supabase
      .from("documents")
      .update({
        status: "processing",
        file_path: path,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        requirement_id: requirementId,
      })
      .eq("id", existingDoc.id)
      .select()
      .single();
    if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
    doc = data as DocRow;
  } else {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        loan_file_id: loanFileId,
        type: (documentType ?? "other") as DocumentType,
        status: "processing",
        file_path: path,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        required: false,
        requirement_id: requirementId,
      })
      .select()
      .single();
    if (error) return NextResponse.json(errorResponse(error.message), { status: 500 });
    doc = data as DocRow;
  }
  if (!doc) return NextResponse.json(errorResponse("Document creation failed"), { status: 500 });

  // Log upload event
  await supabase.from("file_completion_events").insert({
    loan_file_id: loanFileId,
    event_type: "document_uploaded",
    actor: "officer",
    payload: { document_id: doc.id, filename: file.name, document_type: documentType },
  });

  // --- AI Classification Pipeline ---
  try {
    // Step 1: Classify document via Gemini
    const classifyPrompt = buildClassifyPrompt(file.name);
    const classifyResult = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: classifyPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const classifyText = classifyResult.response.text();
    let classifiedType: DocumentType = (documentType ?? "other") as DocumentType;
    let confidenceScore = 0;
    let rationale = "";
    let classificationRaw: Json = {};

    if (classifyText) {
      const jsonMatch = classifyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { type?: string; confidence?: number; reasoning?: string };
        classifiedType = (parsed.type ?? classifiedType) as DocumentType;
        confidenceScore = parsed.confidence ?? 0;
        rationale = parsed.reasoning ?? "";
        classificationRaw = parsed;
      }
    }

    // Track classification token usage
    const classifyUsage = classifyResult.response.usageMetadata;
    await supabase.from("token_usage").insert({
      user_id: user.id,
      loan_file_id: loanFileId,
      module: "classify-document",
      model: MODELS.flash,
      input_tokens: classifyUsage?.promptTokenCount ?? 0,
      output_tokens: classifyUsage?.candidatesTokenCount ?? 0,
      cost_usd:
        ((classifyUsage?.promptTokenCount ?? 0) / 1_000_000) * 0.10 +
        ((classifyUsage?.candidatesTokenCount ?? 0) / 1_000_000) * 0.40,
    });

    // Log classification event
    await supabase.from("file_completion_events").insert({
      loan_file_id: loanFileId,
      event_type: "document_classified",
      actor: "system",
      payload: { document_id: doc.id, classified_type: classifiedType, confidence: confidenceScore },
    });

    // Step 2: Extract fields for validation
    const extractPrompt = buildExtractDocumentPrompt(classifiedType, `Filename: ${file.name}`);
    const extractResult = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: extractPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    let extractedFields: ExtractedFields = {};
    const extractText = extractResult.response.text();
    if (extractText) {
      const jsonMatch = extractText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedFields = JSON.parse(jsonMatch[0]) as ExtractedFields;
      }
    }

    // Track extraction token usage
    const extractUsage = extractResult.response.usageMetadata;
    await supabase.from("token_usage").insert({
      user_id: user.id,
      loan_file_id: loanFileId,
      module: "extract-document",
      model: MODELS.flash,
      input_tokens: extractUsage?.promptTokenCount ?? 0,
      output_tokens: extractUsage?.candidatesTokenCount ?? 0,
      cost_usd:
        ((extractUsage?.promptTokenCount ?? 0) / 1_000_000) * 0.10 +
        ((extractUsage?.candidatesTokenCount ?? 0) / 1_000_000) * 0.40,
    });

    // Step 3: Run deterministic validation
    const validationResult = validateDocument(classifiedType as RequiredDocType, extractedFields);

    // Log validation event
    await supabase.from("file_completion_events").insert({
      loan_file_id: loanFileId,
      event_type: "document_validated",
      actor: "system",
      payload: {
        document_id: doc.id,
        valid: validationResult.valid,
        issues: validationResult.issues,
        missing_fields: validationResult.missing_fields,
      },
    });

    // Step 4: Update document record with classification + validation results
    const newDocStatus = validationResult.valid ? "verified" : "needs_attention";
    await supabase
      .from("documents")
      .update({
        type: classifiedType,
        status: newDocStatus,
        confidence_score: confidenceScore,
        ai_rationale: rationale,
        issues: validationResult.issues.length > 0 ? validationResult.issues : null,
        classification_raw: classificationRaw,
        extracted_data: extractedFields as unknown as Json,
        validated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    // Step 5: Update requirement state if linked
    const targetRequirementId = requirementId ?? doc.requirement_id;
    if (targetRequirementId) {
      const reqState = validationResult.valid
        ? "tentatively_satisfied"
        : validationResult.issues.length > 0
          ? "correction_required"
          : "needs_officer_review";

      await supabase
        .from("document_requirements")
        .update({ state: reqState, updated_at: new Date().toISOString() })
        .eq("id", targetRequirementId);

      await supabase.from("file_completion_events").insert({
        loan_file_id: loanFileId,
        event_type: "requirement_state_changed",
        actor: "system",
        payload: { requirement_id: targetRequirementId, new_state: reqState, document_id: doc.id },
      });
    }

    // Step 6: Auto-resolve matching open conditions if document passed validation
    if (validationResult.valid) {
      const resolver = new ConditionAutoResolver(serviceClient);
      await resolver.resolveForDocument({
        loanFileId,
        documentId: doc.id,
        userId: user.id,
        documentType: classifiedType,
      }).catch((err) => {
        console.error("[documents/upload] Condition auto-resolve failed:", err);
      });
    }

    // Step 7: Create escalation if confidence < threshold
    if (confidenceScore < CONFIDENCE_THRESHOLD) {
      await supabase.from("escalations").insert({
        loan_file_id: loanFileId,
        document_id: doc.id,
        category: "low_confidence_classification",
        severity: confidenceScore < 0.5 ? "high" : "warning",
        status: "open",
        owner_id: user.id,
        description: `Document "${file.name}" was classified as "${classifiedType}" with low confidence (${(confidenceScore * 100).toFixed(0)}%). Officer review recommended.`,
      });

      await supabase.from("file_completion_events").insert({
        loan_file_id: loanFileId,
        event_type: "escalation_created",
        actor: "system",
        payload: { document_id: doc.id, reason: "low_confidence_classification", confidence: confidenceScore },
      });
    }

    // Refetch the updated document
    const { data: updatedDoc } = await supabase
      .from("documents")
      .select("*")
      .eq("id", doc.id)
      .single();

    return NextResponse.json(successResponse(updatedDoc ?? doc), { status: 201 });
  } catch (aiError) {
    // AI pipeline failed — still return the uploaded doc, just mark as uploaded (not processed)
    await supabase
      .from("documents")
      .update({ status: "uploaded" })
      .eq("id", doc.id);

    const { data: fallbackDoc } = await supabase
      .from("documents")
      .select("*")
      .eq("id", doc.id)
      .single();

    return NextResponse.json(successResponse(fallbackDoc ?? doc), { status: 201 });
  }
}

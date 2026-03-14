import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";
import { anthropic, MODELS } from "@/lib/anthropic/client";
import { buildClassifyPrompt } from "@/lib/anthropic/prompts/classify-document";
import { validateDocument } from "@/lib/domain/rules/documentValidationRules";
import { buildExtractDocumentPrompt } from "@/lib/anthropic/prompts/extract-document";
import { CONFIDENCE_THRESHOLD, type RequiredDocType } from "@/lib/domain/enums";
import type { ExtractedFields } from "@/lib/domain/rules/documentValidationRules";
import type { Json } from "@/lib/types/database.types";

type Params = { params: Promise<{ token: string }> };
type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];
type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];
type DocRow = Database["public"]["Tables"]["documents"]["Row"];

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const supabase = await createServiceClient();

  // Verify portal token
  const { data: loanData } = await supabase
    .from("loan_files")
    .select("id, user_id, portal_expires_at")
    .eq("portal_token", token)
    .single();

  if (!loanData) return NextResponse.json(errorResponse("Invalid portal link"), { status: 404 });

  const loan = loanData as Pick<LoanFileRow, "id" | "user_id" | "portal_expires_at">;

  if (loan.portal_expires_at && new Date(loan.portal_expires_at) < new Date()) {
    return NextResponse.json(errorResponse("Portal link expired"), { status: 410 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const documentType = formData.get("documentType") as string | null;
  const requirementId = formData.get("requirementId") as string | null;

  if (!file) return NextResponse.json(errorResponse("No file provided"), { status: 400 });

  // Upload to storage
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `portal/${loan.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("loan-documents")
    .upload(path, buffer, { contentType: file.type });

  if (uploadError) return NextResponse.json(errorResponse(uploadError.message), { status: 500 });

  // Find existing pending document or create new
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("loan_file_id", loan.id)
    .eq("type", (documentType ?? "other") as DocumentType)
    .eq("status", "pending")
    .single();

  const existingDoc = existing as { id: string } | null;
  let doc: DocRow | null = null;

  if (existingDoc) {
    const { data } = await supabase
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
    doc = data as DocRow;
  } else {
    const { data } = await supabase
      .from("documents")
      .insert({
        loan_file_id: loan.id,
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
    doc = data as DocRow;
  }

  if (!doc) return NextResponse.json(errorResponse("Document creation failed"), { status: 500 });

  // Log upload event
  await supabase.from("file_completion_events").insert({
    loan_file_id: loan.id,
    event_type: "document_uploaded",
    actor: "borrower",
    payload: { document_id: doc.id, filename: file.name, document_type: documentType },
  });

  // --- AI Classification Pipeline (same as officer upload) ---
  try {
    // Step 1: Classify
    const classifyPrompt = buildClassifyPrompt(file.name);
    const classifyResponse = await anthropic.messages.create({
      model: MODELS.haiku,
      max_tokens: 500,
      messages: [{ role: "user", content: classifyPrompt }],
    });

    const classifyText = classifyResponse.content.find((b) => b.type === "text");
    let classifiedType: DocumentType = (documentType ?? "other") as DocumentType;
    let confidenceScore = 0;
    let rationale = "";
    let classificationRaw: Json = {};

    if (classifyText && classifyText.type === "text") {
      const jsonMatch = classifyText.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { type?: string; confidence?: number; reasoning?: string };
        classifiedType = (parsed.type ?? classifiedType) as DocumentType;
        confidenceScore = parsed.confidence ?? 0;
        rationale = parsed.reasoning ?? "";
        classificationRaw = parsed;
      }
    }

    // Track token usage
    await supabase.from("token_usage").insert({
      user_id: loan.user_id,
      loan_file_id: loan.id,
      module: "classify-document",
      model: MODELS.haiku,
      input_tokens: classifyResponse.usage.input_tokens,
      output_tokens: classifyResponse.usage.output_tokens,
      cost_usd:
        (classifyResponse.usage.input_tokens / 1_000_000) * 0.8 +
        (classifyResponse.usage.output_tokens / 1_000_000) * 4.0,
    });

    await supabase.from("file_completion_events").insert({
      loan_file_id: loan.id,
      event_type: "document_classified",
      actor: "system",
      payload: { document_id: doc.id, classified_type: classifiedType, confidence: confidenceScore },
    });

    // Step 2: Extract fields
    const extractPrompt = buildExtractDocumentPrompt(classifiedType, `Filename: ${file.name}`);
    const extractResponse = await anthropic.messages.create({
      model: MODELS.haiku,
      max_tokens: 1000,
      messages: [{ role: "user", content: extractPrompt }],
    });

    let extractedFields: ExtractedFields = {};
    const extractText = extractResponse.content.find((b) => b.type === "text");
    if (extractText && extractText.type === "text") {
      const jsonMatch = extractText.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedFields = JSON.parse(jsonMatch[0]) as ExtractedFields;
      }
    }

    await supabase.from("token_usage").insert({
      user_id: loan.user_id,
      loan_file_id: loan.id,
      module: "extract-document",
      model: MODELS.haiku,
      input_tokens: extractResponse.usage.input_tokens,
      output_tokens: extractResponse.usage.output_tokens,
      cost_usd:
        (extractResponse.usage.input_tokens / 1_000_000) * 0.8 +
        (extractResponse.usage.output_tokens / 1_000_000) * 4.0,
    });

    // Step 3: Deterministic validation
    const validationResult = validateDocument(classifiedType as RequiredDocType, extractedFields);

    await supabase.from("file_completion_events").insert({
      loan_file_id: loan.id,
      event_type: "document_validated",
      actor: "system",
      payload: {
        document_id: doc.id,
        valid: validationResult.valid,
        issues: validationResult.issues,
        missing_fields: validationResult.missing_fields,
      },
    });

    // Step 4: Update document
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
        loan_file_id: loan.id,
        event_type: "requirement_state_changed",
        actor: "system",
        payload: { requirement_id: targetRequirementId, new_state: reqState, document_id: doc.id },
      });
    }

    // Step 6: Escalate if low confidence
    if (confidenceScore < CONFIDENCE_THRESHOLD) {
      await supabase.from("escalations").insert({
        loan_file_id: loan.id,
        document_id: doc.id,
        category: "low_confidence_classification",
        severity: confidenceScore < 0.5 ? "high" : "warning",
        status: "open",
        owner_id: loan.user_id,
        description: `Borrower-uploaded document "${file.name}" classified as "${classifiedType}" with low confidence (${(confidenceScore * 100).toFixed(0)}%). Officer review recommended.`,
      });

      await supabase.from("file_completion_events").insert({
        loan_file_id: loan.id,
        event_type: "escalation_created",
        actor: "system",
        payload: { document_id: doc.id, reason: "low_confidence_classification", confidence: confidenceScore },
      });
    }

    // Refetch updated document
    const { data: updatedDoc } = await supabase
      .from("documents")
      .select("*")
      .eq("id", doc.id)
      .single();

    return NextResponse.json(successResponse(updatedDoc ?? doc), { status: 201 });
  } catch {
    // AI pipeline failed — mark as uploaded (not processed)
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

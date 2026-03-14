// ============================================================
// DOCUMENT PIPELINE SERVICE
// Orchestrates: precheck → upload → supersede → AI classify → validate
// Entry point for all document uploads in the file completion engine.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database.types";
import {
  DocumentIntelligenceAgent,
  type ProcessDocumentResult,
} from "@/lib/agents/documentIntelligenceAgent";
import { WorkflowEngine } from "@/lib/workflow/workflowEngine";
import type { RequiredDocType } from "@/lib/domain/enums";

// ── Constants ────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const STORAGE_BUCKET = "documents";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
]);

// ── Types ────────────────────────────────────────────────────

export interface PipelineResult {
  success: boolean;
  document_id?: string;
  storage_path?: string;
  classification?: RequiredDocType;
  confidence?: number;
  issues?: string[];
  needs_human_review?: boolean;
  error?: string;
}

export interface PipelineInput {
  loanFileId: string;
  requirementId: string;
  fileBuffer: Buffer;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
}

// ── Pipeline ─────────────────────────────────────────────────

export class DocumentPipeline {
  private agent: DocumentIntelligenceAgent;

  constructor() {
    this.agent = new DocumentIntelligenceAgent();
  }

  /**
   * Full document processing pipeline.
   * Precheck → upload to Supabase Storage → supersede old docs → AI classify → validate
   */
  async process(params: PipelineInput): Promise<PipelineResult> {
    // ── Step 1: Precheck ──────────────────────────────────────
    const precheckResult = this.precheck(params);
    if (!precheckResult.valid) {
      return { success: false, error: precheckResult.error };
    }

    const db = await createServiceClient();

    // ── Step 2: Create document record ────────────────────────
    const { data: doc, error: insertError } = await db
      .from("documents")
      .insert({
        loan_file_id: params.loanFileId,
        requirement_id: params.requirementId,
        type: "other" as const, // Will be updated by AI classification
        status: "uploaded" as const,
        original_filename: params.fileName,
        file_size_bytes: params.fileSize,
        mime_type: params.mimeType,
        file_path: "", // Will be updated after storage upload
        uploaded_at: new Date().toISOString(),
        classification_raw: { processing_state: "received" } as Json,
      })
      .select("id")
      .single();

    if (insertError || !doc) {
      return {
        success: false,
        error: `Failed to create document record: ${insertError?.message ?? "Unknown error"}`,
      };
    }

    const documentId = doc.id;

    // ── Step 3: Upload to Supabase Storage ────────────────────
    const storagePath = `documents/${params.loanFileId}/${documentId}/${params.fileName}`;

    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, params.fileBuffer, {
        contentType: params.mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[DocumentPipeline] Storage upload failed:", {
        documentId,
        error: uploadError.message,
      });

      // Mark document as failed
      await db
        .from("documents")
        .update({
          status: "rejected",
          classification_raw: { processing_state: "precheck_failed" } as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      return { success: false, error: "File upload failed. Please try again." };
    }

    // Update file path
    await db
      .from("documents")
      .update({ file_path: storagePath, updated_at: new Date().toISOString() })
      .eq("id", documentId);

    // ── Step 4: Supersede previous documents for this requirement ──
    await this.supersedePreviousDocuments(db, params.requirementId, documentId);

    // ── Step 5: Update requirement state to uploaded_pending_validation ──
    const engine = new WorkflowEngine(db);
    await engine.transitionRequirement(params.requirementId, "uploaded_pending_validation");

    // Log upload event
    await db.from("file_completion_events").insert({
      loan_file_id: params.loanFileId,
      event_type: "document_uploaded",
      actor: params.uploadedBy ?? "borrower",
      payload: {
        document_id: documentId,
        file_name: params.fileName,
        file_size: params.fileSize,
        mime_type: params.mimeType,
      },
    });

    // ── Step 6: Run AI classification + validation pipeline ───
    let aiResult: ProcessDocumentResult;
    try {
      aiResult = await this.agent.processDocument({
        documentId,
        loanFileId: params.loanFileId,
        requirementId: params.requirementId,
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileDescription: `Uploaded file: ${params.fileName} (${params.mimeType}, ${params.fileSize} bytes)`,
      });
    } catch (error) {
      console.error("[DocumentPipeline] AI pipeline failed:", {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        document_id: documentId,
        storage_path: storagePath,
        error: "Document uploaded but AI processing failed. The document will be reviewed manually.",
        needs_human_review: true,
      };
    }

    return {
      success: aiResult.success,
      document_id: documentId,
      storage_path: storagePath,
      classification: aiResult.classification,
      confidence: aiResult.confidence_score,
      issues: aiResult.issues,
      needs_human_review: aiResult.needs_human_review,
      error: aiResult.error,
    };
  }

  // ── Precheck ───────────────────────────────────────────────

  private precheck(params: {
    fileSize: number;
    mimeType: string;
    fileName: string;
  }): { valid: boolean; error?: string } {
    if (params.fileSize > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`,
      };
    }

    if (!ALLOWED_MIME_TYPES.has(params.mimeType.toLowerCase())) {
      return {
        valid: false,
        error: "File type not supported. Please upload a PDF, JPG, PNG, or HEIC file.",
      };
    }

    if (!params.fileName || params.fileName.length > 255) {
      return { valid: false, error: "Invalid file name." };
    }

    return { valid: true };
  }

  // ── Supersede previous documents ───────────────────────────

  private async supersedePreviousDocuments(
    db: SupabaseClient<Database>,
    requirementId: string,
    newDocumentId: string
  ): Promise<void> {
    // Find all non-superseded docs for this requirement (excluding the new one)
    const { data: oldDocs } = await db
      .from("documents")
      .select("id")
      .eq("requirement_id", requirementId)
      .is("superseded_by", null)
      .neq("id", newDocumentId);

    if (!oldDocs || oldDocs.length === 0) return;

    for (const oldDoc of oldDocs) {
      await db
        .from("documents")
        .update({
          superseded_by: newDocumentId,
          classification_raw: { processing_state: "superseded" } as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", oldDoc.id);

      // Log supersession event
      await db.from("file_completion_events").insert({
        loan_file_id: null, // Will be inferred from the document
        event_type: "document_superseded",
        actor: "system",
        payload: {
          old_document_id: oldDoc.id,
          new_document_id: newDocumentId,
          requirement_id: requirementId,
        },
      });
    }
  }
}

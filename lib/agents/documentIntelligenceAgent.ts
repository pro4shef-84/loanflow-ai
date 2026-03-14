// ============================================================
// DOCUMENT INTELLIGENCE AGENT
// AI-powered document classification + deterministic validation
// Pipeline: mark processing -> Gemini classify -> validate -> update states
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database.types";
import { flashModel, MODELS, extractJson } from "@/lib/ai/client";
import { documentClassificationPrompt } from "@/lib/anthropic/prompts/file-completion";
import {
  DocumentIntelligenceSchema,
  type DocumentIntelligenceOutput,
} from "@/lib/anthropic/schemas/file-completion";
import { validateDocument } from "@/lib/domain/rules/documentValidationRules";
import type { ExtractedFields } from "@/lib/domain/rules/documentValidationRules";
import { WorkflowEngine } from "@/lib/workflow/workflowEngine";
import { CONFIDENCE_THRESHOLD, type RequiredDocType } from "@/lib/domain/enums";

export interface ProcessDocumentResult {
  success: boolean;
  document_id: string;
  classification: RequiredDocType;
  confidence_score: number;
  issues: string[];
  needs_human_review: boolean;
  validation_passed: boolean;
  error?: string;
}

export class DocumentIntelligenceAgent {
  /**
   * Process a document through the AI classification + validation pipeline.
   */
  async processDocument(params: {
    documentId: string;
    loanFileId: string;
    requirementId: string;
    fileName: string;
    mimeType: string;
    fileDescription?: string;
  }): Promise<ProcessDocumentResult> {
    const db = await createServiceClient();
    const engine = new WorkflowEngine(db);

    try {
      // Step 1: Mark document as processing
      await this.updateDocumentState(db, params.documentId, "processing");

      // Step 2: Build prompt and call Gemini
      const prompt = documentClassificationPrompt({
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileDescription: params.fileDescription ?? `File: ${params.fileName}`,
      });

      let aiResult: DocumentIntelligenceOutput;
      try {
        aiResult = await this.callGemini(prompt);
      } catch (aiError) {
        console.error("[DocumentIntelligenceAgent] AI classification failed:", {
          documentId: params.documentId,
          error: aiError instanceof Error ? aiError.message : String(aiError),
        });
        await this.handleSystemFailure(db, engine, params.documentId, params.loanFileId);
        return {
          success: false,
          document_id: params.documentId,
          classification: "unknown_document",
          confidence_score: 0,
          issues: ["AI classification system error — document sent for human review."],
          needs_human_review: true,
          validation_passed: false,
          error: "AI system error",
        };
      }

      // Step 3: Mark as classified and store AI output
      await db
        .from("documents")
        .update({
          type: this.mapToDocumentType(aiResult.doc_type),
          confidence_score: aiResult.confidence_score,
          ai_rationale: aiResult.rationale_summary,
          extracted_data: aiResult.extracted_fields as unknown as Json,
          classification_raw: {
            ...aiResult,
            processing_state: "classified",
          } as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.documentId);

      // Step 4: Check confidence threshold
      if (aiResult.confidence_score < CONFIDENCE_THRESHOLD) {
        console.warn("[DocumentIntelligenceAgent] Low confidence:", {
          documentId: params.documentId,
          score: aiResult.confidence_score,
          doc_type: aiResult.doc_type,
        });

        const lowConfIssues = [
          ...aiResult.issues,
          `Classification confidence (${(aiResult.confidence_score * 100).toFixed(0)}%) below threshold — human review required.`,
        ];

        await db
          .from("documents")
          .update({
            status: "needs_attention",
            issues: lowConfIssues as unknown as Json,
            classification_raw: {
              ...aiResult,
              processing_state: "needs_officer_review",
            } as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.documentId);

        await engine.createEscalation(
          params.loanFileId,
          "low_confidence_classification",
          "high",
          `Document "${params.fileName}" classified as ${aiResult.doc_type} with only ${(aiResult.confidence_score * 100).toFixed(0)}% confidence.`,
          params.documentId
        );

        await engine.transitionRequirement(params.requirementId, "needs_officer_review");

        return {
          success: true,
          document_id: params.documentId,
          classification: aiResult.doc_type as RequiredDocType,
          confidence_score: aiResult.confidence_score,
          issues: lowConfIssues,
          needs_human_review: true,
          validation_passed: false,
        };
      }

      // Step 5: Handle unknown document type
      if (aiResult.doc_type === "unknown_document") {
        const unknownIssues = [
          ...aiResult.issues,
          "Document type could not be identified. Please upload the correct document.",
        ];

        await db
          .from("documents")
          .update({
            status: "rejected",
            issues: unknownIssues as unknown as Json,
            classification_raw: {
              ...aiResult,
              processing_state: "rejected",
            } as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.documentId);

        await engine.transitionRequirement(params.requirementId, "correction_required");

        return {
          success: true,
          document_id: params.documentId,
          classification: "unknown_document",
          confidence_score: aiResult.confidence_score,
          issues: unknownIssues,
          needs_human_review: false,
          validation_passed: false,
        };
      }

      // Step 6: Run deterministic validation rules
      const validation = validateDocument(
        aiResult.doc_type as RequiredDocType,
        aiResult.extracted_fields as ExtractedFields
      );

      const allIssues = [...new Set([...aiResult.issues, ...validation.issues])];

      // Step 7: Check for suspicious indicators
      if (this.detectSuspiciousIndicators(aiResult)) {
        await db
          .from("documents")
          .update({
            status: "needs_attention",
            issues: [
              ...allIssues,
              "Document flagged for potential authenticity concerns — human review required.",
            ] as unknown as Json,
            classification_raw: {
              ...aiResult,
              processing_state: "needs_officer_review",
            } as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.documentId);

        await engine.createEscalation(
          params.loanFileId,
          "suspicious_document",
          "critical",
          `Document "${params.fileName}" flagged for potential authenticity concerns.`,
          params.documentId
        );

        await engine.transitionRequirement(params.requirementId, "needs_officer_review");

        return {
          success: true,
          document_id: params.documentId,
          classification: aiResult.doc_type as RequiredDocType,
          confidence_score: aiResult.confidence_score,
          issues: allIssues,
          needs_human_review: true,
          validation_passed: false,
        };
      }

      // Step 8: Update with final validation result
      const passed = validation.valid;
      const finalProcessingState = passed ? "validated_ok" : "validated_issue_found";
      const finalDocStatus = passed ? "verified" : "needs_attention";

      await db
        .from("documents")
        .update({
          status: finalDocStatus,
          issues: allIssues as unknown as Json,
          validated_at: new Date().toISOString(),
          classification_raw: {
            ...aiResult,
            processing_state: finalProcessingState,
          } as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.documentId);

      // Step 9: Update requirement state via workflow
      if (passed) {
        await engine.transitionRequirement(params.requirementId, "tentatively_satisfied");
      } else {
        await engine.transitionRequirement(params.requirementId, "correction_required");
      }

      // Step 10: Evaluate overall loan doc status
      await engine.evaluateLoanDocStatus(params.loanFileId);

      return {
        success: true,
        document_id: params.documentId,
        classification: aiResult.doc_type as RequiredDocType,
        confidence_score: aiResult.confidence_score,
        issues: allIssues,
        needs_human_review: false,
        validation_passed: passed,
      };
    } catch (error) {
      console.error("[DocumentIntelligenceAgent] Processing failed:", {
        documentId: params.documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleSystemFailure(db, engine, params.documentId, params.loanFileId);
      return {
        success: false,
        document_id: params.documentId,
        classification: "unknown_document",
        confidence_score: 0,
        issues: ["System error during document processing."],
        needs_human_review: true,
        validation_passed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async callGemini(prompt: string): Promise<DocumentIntelligenceOutput> {
    const result = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    if (!text) {
      throw new Error("No text response from Gemini");
    }

    const parsed = JSON.parse(extractJson(text)) as unknown;
    const validated = DocumentIntelligenceSchema.parse(parsed);
    return validated;
  }

  private detectSuspiciousIndicators(result: DocumentIntelligenceOutput): boolean {
    const suspiciousKeywords = [
      "altered",
      "modified",
      "inconsistent font",
      "suspicious",
      "potentially fraudulent",
      "editing artifacts",
      "metadata mismatch",
    ];
    const combinedText = [
      result.rationale_summary,
      ...result.issues,
    ].join(" ").toLowerCase();

    return suspiciousKeywords.some((kw) => combinedText.includes(kw));
  }

  private mapToDocumentType(
    aiDocType: string
  ): Database["public"]["Tables"]["documents"]["Row"]["type"] {
    // Map file-completion doc types to the documents table's type enum
    const mapping: Record<string, Database["public"]["Tables"]["documents"]["Row"]["type"]> = {
      pay_stub: "pay_stub",
      w2: "w2",
      bank_statement: "bank_statement",
      government_id: "drivers_license",
      purchase_contract: "purchase_contract",
      mortgage_statement: "mortgage_statement",
      homeowners_insurance: "homeowners_insurance",
      tax_return_1040: "tax_return_1040",
      schedule_c: "schedule_c",
      profit_loss_statement: "other",
      dd214: "other",
      va_coe: "other",
      fha_case_number: "other",
      unknown_document: "other",
    };
    return mapping[aiDocType] ?? "other";
  }

  private async updateDocumentState(
    db: SupabaseClient<Database>,
    documentId: string,
    processingState: string
  ): Promise<void> {
    const { data: doc } = await db
      .from("documents")
      .select("classification_raw")
      .eq("id", documentId)
      .single();

    const existingRaw = (doc?.classification_raw ?? {}) as Record<string, Json | undefined>;

    await db
      .from("documents")
      .update({
        status: "processing",
        classification_raw: {
          ...existingRaw,
          processing_state: processingState,
        } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
  }

  private async handleSystemFailure(
    db: SupabaseClient<Database>,
    engine: WorkflowEngine,
    documentId: string,
    loanFileId: string
  ): Promise<void> {
    await db
      .from("documents")
      .update({
        status: "needs_attention",
        issues: ["System processing error — document sent for human review."] as unknown as Json,
        classification_raw: {
          processing_state: "needs_officer_review",
        } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    await engine.createEscalation(
      loanFileId,
      "system_processing_failure",
      "high",
      "System error during document processing — requires manual review.",
      documentId
    );
  }
}

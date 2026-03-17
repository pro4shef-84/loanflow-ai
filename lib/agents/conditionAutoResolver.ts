// ============================================================
// CONDITION AUTO-RESOLVER
// After a document passes AI validation, auto-check all open
// conditions for the loan file and mark them satisfied if matched.
// Called by DocumentIntelligenceAgent after successful processing.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { proModel, extractJson } from "@/lib/ai/client";
import { buildValidateConditionPrompt } from "@/lib/anthropic/prompts/validate-condition";
import { maskObject } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";

type ConditionRow = Database["public"]["Tables"]["conditions"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

interface AutoResolveResult {
  conditionId: string;
  satisfied: boolean;
  confidence: number;
  explanation: string;
}

export class ConditionAutoResolver {
  constructor(private db: SupabaseClient<Database>) {}

  /**
   * Run after a document passes validation.
   * Checks all open conditions for the loan file and resolves matches.
   */
  async resolveForDocument(params: {
    loanFileId: string;
    documentId: string;
    userId: string;
    documentType: string;
  }): Promise<AutoResolveResult[]> {
    // Fetch open conditions for this loan
    const { data: conditionsRaw } = await this.db
      .from("conditions")
      .select("*")
      .eq("loan_file_id", params.loanFileId)
      .in("status", ["open", "borrower_notified", "document_received"]);

    const conditions = (conditionsRaw ?? []) as unknown as ConditionRow[];
    if (conditions.length === 0) return [];

    // Fetch the document with its extracted data
    const { data: documentRaw } = await this.db
      .from("documents")
      .select("*")
      .eq("id", params.documentId)
      .single();

    const document = documentRaw as unknown as DocumentRow | null;
    if (!document) return [];

    const results: AutoResolveResult[] = [];

    // Check each open condition against this document
    for (const condition of conditions) {
      const result = await this.checkCondition(condition, document, params.userId);
      results.push(result);

      if (result.satisfied) {
        await this.db
          .from("conditions")
          .update({
            status: "validated",
            document_id: params.documentId,
            validated_at: new Date().toISOString(),
            notes: `Auto-resolved: ${result.explanation}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", condition.id);

        console.log(`[ConditionAutoResolver] Condition ${condition.id} auto-resolved by document ${params.documentId}`);
      }
    }

    return results;
  }

  private async checkCondition(
    condition: ConditionRow,
    document: DocumentRow,
    userId: string
  ): Promise<AutoResolveResult> {
    const conditionText = condition.lender_condition_text ?? condition.plain_english_summary ?? "";

    // Quick type-match pre-filter: if condition specifies a required doc type
    // and this document doesn't match, skip the AI call
    if (condition.required_document_type) {
      const normalizedRequired = condition.required_document_type.toLowerCase().replace(/[\s-]/g, "_");
      const normalizedDocType = document.type.toLowerCase().replace(/[\s-]/g, "_");

      if (!normalizedDocType.includes(normalizedRequired) && !normalizedRequired.includes(normalizedDocType)) {
        return {
          conditionId: condition.id,
          satisfied: false,
          confidence: 1.0,
          explanation: "Document type does not match condition requirement — skipped AI check.",
        };
      }
    }

    try {
      const maskedData = maskObject(document.extracted_data);
      const prompt = buildValidateConditionPrompt(conditionText, maskedData);

      const result = await proModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });

      const text = result.response.text();
      const parsed = JSON.parse(extractJson(text)) as {
        satisfied: boolean;
        confidence: number;
        explanation: string;
        gaps: string[];
        recommendation: string;
      };

      // Track token usage
      const usage = result.response.usageMetadata;
      await trackTokenUsage({
        userId,
        module: "condition-auto-resolve",
        model: "gemini-2.0-flash",
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        costUsd: estimateCost("validate-condition", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
      });

      return {
        conditionId: condition.id,
        satisfied: parsed.satisfied && parsed.confidence >= 0.75,
        confidence: parsed.confidence,
        explanation: parsed.explanation,
      };
    } catch (err) {
      console.error(`[ConditionAutoResolver] Error checking condition ${condition.id}:`, err);
      return {
        conditionId: condition.id,
        satisfied: false,
        confidence: 0,
        explanation: "Auto-check failed — manual review required.",
      };
    }
  }
}

// ============================================================
// CHECKLIST AGENT
// Generates document requirement checklist deterministically
// based on loan type and employment type.
// Idempotent: won't duplicate if requirements already exist.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import {
  REQUIRED_DOCS_BY_LOAN_TYPE,
  SELF_EMPLOYED_ADDITIONAL_DOCS,
  type RequiredDocType,
  type EmploymentType,
} from "@/lib/domain/enums";

export interface ChecklistResult {
  success: boolean;
  requirements: string[];
  error?: string;
}

export class ChecklistAgent {
  /**
   * Generate a document requirement checklist for a loan file.
   * Idempotent: if requirements already exist, returns existing IDs.
   */
  async generateChecklist(params: {
    loanFileId: string;
    loanType: string;
    employmentType?: EmploymentType | null;
  }): Promise<ChecklistResult> {
    const supabase = await createClient();
    return this.generateChecklistWithClient(supabase, params);
  }

  /**
   * Generate checklist using a provided Supabase client.
   * Useful when the caller already has a client (e.g., from an API route).
   */
  async generateChecklistWithClient(
    db: SupabaseClient<Database>,
    params: {
      loanFileId: string;
      loanType: string;
      employmentType?: EmploymentType | null;
    }
  ): Promise<ChecklistResult> {
    const baseDocs = REQUIRED_DOCS_BY_LOAN_TYPE[params.loanType];
    if (!baseDocs) {
      return {
        success: false,
        requirements: [],
        error: `Unsupported loan type: ${params.loanType}`,
      };
    }

    // Idempotency: check if requirements already exist
    const { data: existing, error: fetchError } = await db
      .from("document_requirements")
      .select("id, doc_type")
      .eq("loan_file_id", params.loanFileId);

    if (fetchError) {
      return {
        success: false,
        requirements: [],
        error: `Failed to check existing requirements: ${fetchError.message}`,
      };
    }

    if (existing && existing.length > 0) {
      return {
        success: true,
        requirements: existing.map((r) => r.id),
      };
    }

    // Build the full doc list (base + employment-specific)
    const allDocs = this.buildDocList(baseDocs, params.employmentType ?? null);

    // Insert all document requirements
    const records = allDocs.map((docType) => ({
      loan_file_id: params.loanFileId,
      doc_type: docType,
      state: "required" as const,
    }));

    const { data, error: insertError } = await db
      .from("document_requirements")
      .insert(records)
      .select("id");

    if (insertError) {
      return {
        success: false,
        requirements: [],
        error: `Failed to create checklist: ${insertError.message}`,
      };
    }

    // Update loan file to mark checklist as generated
    await db
      .from("loan_files")
      .update({
        checklist_generated_at: new Date().toISOString(),
        doc_workflow_state: "awaiting_documents",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.loanFileId);

    return {
      success: true,
      requirements: (data ?? []).map((r) => r.id),
    };
  }

  /**
   * Get the list of required doc types for a loan type + employment type,
   * without creating any DB records.
   */
  getRequiredDocTypes(
    loanType: string,
    employmentType?: EmploymentType | null
  ): RequiredDocType[] {
    const baseDocs = REQUIRED_DOCS_BY_LOAN_TYPE[loanType];
    if (!baseDocs) return [];
    return this.buildDocList(baseDocs, employmentType ?? null);
  }

  private buildDocList(
    baseDocs: RequiredDocType[],
    employmentType: EmploymentType | null
  ): RequiredDocType[] {
    const docs = [...baseDocs];

    // Add self-employed docs if applicable
    if (
      employmentType === "self_employed" ||
      employmentType === "1099"
    ) {
      for (const doc of SELF_EMPLOYED_ADDITIONAL_DOCS) {
        if (!docs.includes(doc)) {
          docs.push(doc);
        }
      }
    }

    return docs;
  }
}

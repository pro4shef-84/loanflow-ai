// ============================================================
// REVIEW / COPILOT AGENT
// AI-powered officer review summaries + review decision management
// Officers can: get summaries, submit reviews, waive requirements
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database.types";
import { anthropic, MODELS } from "@/lib/anthropic/client";
import { officerCopilotPrompt } from "@/lib/anthropic/prompts/file-completion";
import {
  OfficerCopilotSchema,
  type OfficerCopilotOutput,
} from "@/lib/anthropic/schemas/file-completion";
import { WorkflowEngine } from "@/lib/workflow/workflowEngine";
import type {
  ReviewDecisionType,
  DocWorkflowState,
  DocumentRequirementState,
} from "@/lib/domain/enums";

export class ReviewCopilotAgent {
  /**
   * Generate an AI-powered review summary for a loan file.
   * Fetches all context (requirements, escalations, borrower info)
   * and calls Claude for a structured summary.
   */
  async generateSummary(loanFileId: string): Promise<OfficerCopilotOutput | null> {
    const db = await createServiceClient();

    try {
      // Fetch loan file with borrower info
      const { data: loan, error: loanError } = await db
        .from("loan_files")
        .select("id, loan_type, doc_workflow_state, borrower_id")
        .eq("id", loanFileId)
        .single();

      if (loanError || !loan) {
        console.error("[ReviewCopilotAgent] Loan file not found:", loanFileId);
        return null;
      }

      // Get borrower name
      let borrowerName = "Unknown";
      if (loan.borrower_id) {
        const { data: contact } = await db
          .from("contacts")
          .select("first_name, last_name")
          .eq("id", loan.borrower_id)
          .single();

        if (contact) {
          borrowerName = `${contact.first_name} ${contact.last_name}`.trim();
        }
      }

      // Also check loan_applications for name
      if (borrowerName === "Unknown") {
        const { data: app } = await db
          .from("loan_applications")
          .select("borrower_first_name, borrower_last_name")
          .eq("loan_file_id", loanFileId)
          .single();

        if (app?.borrower_first_name) {
          borrowerName = `${app.borrower_first_name} ${app.borrower_last_name ?? ""}`.trim();
        }
      }

      // Fetch document requirements with linked documents
      const { data: requirements } = await db
        .from("document_requirements")
        .select("id, doc_type, state")
        .eq("loan_file_id", loanFileId);

      // For each requirement, get the latest document
      const documentSummaries: Array<{
        doc_type: string;
        state: string;
        issues: string[];
        confidence_score: number | null;
      }> = [];

      for (const req of requirements ?? []) {
        const { data: docs } = await db
          .from("documents")
          .select("confidence_score, issues")
          .eq("loan_file_id", loanFileId)
          .eq("requirement_id", req.id)
          .is("superseded_by", null)
          .order("created_at", { ascending: false })
          .limit(1);

        const latestDoc = docs?.[0] ?? null;
        const issues = Array.isArray(latestDoc?.issues)
          ? (latestDoc.issues as string[])
          : [];

        documentSummaries.push({
          doc_type: req.doc_type,
          state: req.state,
          issues,
          confidence_score: latestDoc?.confidence_score ?? null,
        });
      }

      // Fetch open escalations
      const { data: escalations } = await db
        .from("escalations")
        .select("category, severity, status")
        .eq("loan_file_id", loanFileId)
        .in("status", ["open", "acknowledged"]);

      // Build prompt and call Claude
      const prompt = officerCopilotPrompt({
        loanFileId,
        borrowerName,
        loanType: loan.loan_type,
        docWorkflowState: loan.doc_workflow_state ?? "checklist_pending",
        documentSummaries,
        escalations: (escalations ?? []).map((e) => ({
          category: e.category,
          severity: e.severity,
          status: e.status,
        })),
      });

      const response = await anthropic.messages.create({
        model: MODELS.sonnet,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.error("[ReviewCopilotAgent] No text response from Claude");
        return null;
      }

      const parsed = JSON.parse(textBlock.text) as unknown;
      const validated = OfficerCopilotSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error("[ReviewCopilotAgent] Summary generation failed:", {
        loanFileId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Submit an officer review decision.
   * Only officers can set review_ready — never AI.
   */
  async submitReview(params: {
    loanFileId: string;
    userId: string;
    decision: ReviewDecisionType;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await createServiceClient();
    const engine = new WorkflowEngine(db);

    // Capture current document state as snapshot
    const { data: requirements } = await db
      .from("document_requirements")
      .select("id, doc_type, state, notes")
      .eq("loan_file_id", params.loanFileId);

    const documentSnapshot = (requirements ?? []).map((r) => ({
      id: r.id,
      doc_type: r.doc_type,
      state: r.state,
      notes: r.notes,
    }));

    // Insert review decision (immutable audit trail)
    const { error: insertError } = await db
      .from("review_decisions")
      .insert({
        loan_file_id: params.loanFileId,
        user_id: params.userId,
        decision: params.decision,
        notes: params.notes ?? null,
        document_snapshot: documentSnapshot as unknown as Json,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Transition doc workflow state based on decision
    let targetState: DocWorkflowState | null = null;
    switch (params.decision) {
      case "review_ready":
        targetState = "review_ready";
        break;
      case "needs_correction":
        targetState = "corrections_needed";
        break;
      case "archived":
        // No state transition for archived
        break;
    }

    if (targetState) {
      const transitionResult = await engine.transitionDocWorkflow(
        params.loanFileId,
        targetState,
        "officer",
        params.userId
      );

      if (!transitionResult.success) {
        // Review decision is already recorded; log the transition failure
        console.warn("[ReviewCopilotAgent] Workflow transition failed:", {
          loanFileId: params.loanFileId,
          targetState,
          error: transitionResult.error,
        });
      }
    }

    // Log event
    await db.from("file_completion_events").insert({
      loan_file_id: params.loanFileId,
      event_type: "officer_review_submitted",
      actor: params.userId,
      payload: {
        decision: params.decision,
        notes: params.notes ?? null,
      },
    });

    return { success: true };
  }

  /**
   * Officer can waive a document requirement.
   */
  async waiveRequirement(params: {
    requirementId: string;
    userId: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await createServiceClient();
    const engine = new WorkflowEngine(db);

    // Get the requirement to find the loan_file_id
    const { data: req, error: fetchError } = await db
      .from("document_requirements")
      .select("loan_file_id, state, doc_type")
      .eq("id", params.requirementId)
      .single();

    if (fetchError || !req) {
      return { success: false, error: "Requirement not found" };
    }

    // Only certain states can transition to waived
    const waivableStates: DocumentRequirementState[] = [
      "required",
      "awaiting_upload",
      "needs_officer_review",
    ];

    if (!waivableStates.includes(req.state as DocumentRequirementState)) {
      return {
        success: false,
        error: `Cannot waive requirement in state "${req.state}"`,
      };
    }

    // Transition via workflow engine
    const result = await engine.transitionRequirement(
      params.requirementId,
      "waived_by_officer",
      params.userId
    );

    if (!result.success) {
      return result;
    }

    // Update notes if provided
    if (params.notes) {
      await db
        .from("document_requirements")
        .update({ notes: params.notes })
        .eq("id", params.requirementId);
    }

    // Log event
    await db.from("file_completion_events").insert({
      loan_file_id: req.loan_file_id,
      event_type: "officer_waived_requirement",
      actor: params.userId,
      payload: {
        requirement_id: params.requirementId,
        doc_type: req.doc_type,
        notes: params.notes ?? null,
      },
    });

    // Re-evaluate overall loan doc status
    await engine.evaluateLoanDocStatus(req.loan_file_id);

    return { success: true };
  }
}

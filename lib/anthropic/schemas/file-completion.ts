// ============================================================
// AI OUTPUT SCHEMAS — File Completion Engine
// Zod schemas for validating structured AI responses
// ============================================================

import { z } from "zod";

// ── Document Intelligence Schema ─────────────────────────────
// Used by DocumentIntelligenceAgent to validate AI classification output

export const DocumentIntelligenceSchema = z.object({
  doc_type: z.string(),
  confidence_score: z.number().min(0).max(1),
  issues: z.array(z.string()).default([]),
  rationale_summary: z.string(),
  extracted_fields: z.record(z.string(), z.string()).default({}),
});

export type DocumentIntelligenceOutput = z.infer<typeof DocumentIntelligenceSchema>;

// ── Officer Copilot Schema ───────────────────────────────────
// Used by ReviewCopilotAgent for structured officer summaries

export const OfficerCopilotSchema = z.object({
  overall_status: z.string(),
  unresolved_issues: z.array(z.string()).default([]),
  confidence_flags: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  document_summaries: z.array(
    z.object({
      doc_type: z.string(),
      state: z.string(),
      issues: z.array(z.string()).default([]),
    })
  ).default([]),
});

export type OfficerCopilotOutput = z.infer<typeof OfficerCopilotSchema>;

// ── Borrower Concierge Schema ────────────────────────────────
// Used by portal Q&A for borrower-facing responses

export const BorrowerConciergeSchema = z.object({
  message: z.string(),
  is_advisory_question: z.boolean().default(false),
  escalation_required: z.boolean().default(false),
  escalation_reason: z.string().optional(),
});

export type BorrowerConciergeOutput = z.infer<typeof BorrowerConciergeSchema>;

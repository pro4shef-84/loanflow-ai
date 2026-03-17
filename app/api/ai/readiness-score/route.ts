import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { proModel, extractJson } from "@/lib/ai/client";
import { getModelForTask } from "@/lib/anthropic/token-router";
import { buildReadinessScorePrompt } from "@/lib/anthropic/prompts/readiness-score";
import type { FileCompletionContext } from "@/lib/anthropic/prompts/readiness-score";
import { ReadinessScoreSchema } from "@/lib/anthropic/schemas/readiness-score";
import { maskObject } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database, Json } from "@/lib/types/database.types";
import type { DocumentRequirementState, DocWorkflowState } from "@/lib/domain/enums";
import { checkAiRateLimit, rateLimitResponse } from "@/lib/utils/ai-rate-limiter";

type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type ConditionRow = Database["public"]["Tables"]["conditions"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type RequirementRow = Database["public"]["Tables"]["document_requirements"]["Row"];
type EscalationRow = Database["public"]["Tables"]["escalations"]["Row"];

type LoanWithRelations = LoanFileRow & {
  documents: DocumentRow[];
  conditions: ConditionRow[];
  contacts: ContactRow | null;
};

/** States considered "satisfied" for a requirement. */
const SATISFIED_STATES: DocumentRequirementState[] = [
  "tentatively_satisfied",
  "confirmed_by_officer",
  "waived_by_officer",
];

/**
 * Build the file completion context from loan data for the readiness prompt.
 */
function buildFileCompletionContext(
  docWorkflowState: string | null,
  requirements: RequirementRow[],
  escalations: EscalationRow[]
): FileCompletionContext | undefined {
  if (requirements.length === 0) return undefined;

  const satisfiedCount = requirements.filter((r) =>
    SATISFIED_STATES.includes(r.state as DocumentRequirementState)
  ).length;

  const correctionCount = requirements.filter(
    (r) => r.state === "correction_required"
  ).length;

  const openEscalationCount = escalations.filter(
    (e) => e.status === "open" || e.status === "acknowledged"
  ).length;

  return {
    docWorkflowState: (docWorkflowState as DocWorkflowState) ?? null,
    totalRequirements: requirements.length,
    satisfiedRequirements: satisfiedCount,
    correctionRequired: correctionCount,
    openEscalations: openEscalationCount,
    requirementDetails: requirements.map((r) => ({
      docType: r.doc_type,
      state: r.state as DocumentRequirementState,
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    // Rate limit check
    const { data: profile } = await supabase.from("users").select("subscription_tier").eq("id", user.id).single();
    const rateLimit = await checkAiRateLimit(supabase, user.id, profile?.subscription_tier ?? "trial");
    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimitResponse(rateLimit), { status: 429 });
    }

    const body = await request.json();
    const { loanFileId } = body;
    if (!loanFileId) return NextResponse.json(errorResponse("loanFileId required"), { status: 400 });

    const { data: loan } = await supabase
      .from("loan_files")
      .select("*, documents(*), conditions(*), contacts(*)")
      .eq("id", loanFileId)
      .single();

    if (!loan) return NextResponse.json(errorResponse("Loan not found"), { status: 404 });

    const typedLoan = loan as unknown as LoanWithRelations;

    // Fetch file completion engine data
    const [requirementsResult, escalationsResult] = await Promise.all([
      supabase
        .from("document_requirements")
        .select("*")
        .eq("loan_file_id", loanFileId),
      supabase
        .from("escalations")
        .select("*")
        .eq("loan_file_id", loanFileId),
    ]);

    const requirements = (requirementsResult.data ?? []) as RequirementRow[];
    const escalations = (escalationsResult.data ?? []) as EscalationRow[];

    const fileCompletionCtx = buildFileCompletionContext(
      typedLoan.doc_workflow_state,
      requirements,
      escalations
    );

    const maskedData = maskObject(typedLoan);
    const model = getModelForTask("readiness-score");
    const prompt = buildReadinessScorePrompt(maskedData, fileCompletionCtx);

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = ReadinessScoreSchema.parse(JSON.parse(extractJson(text)));

    // Save to loan file
    await serviceClient
      .from("loan_files")
      .update({
        submission_readiness_score: parsed.score,
        readiness_breakdown: parsed as unknown as Json,
      })
      .eq("id", loanFileId);

    const usage = result.response.usageMetadata;
    await trackTokenUsage({
      userId: user.id,
      loanFileId,
      module: "readiness-score",
      model,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      costUsd: estimateCost("readiness-score", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
    });

    return NextResponse.json(successResponse(parsed));
  } catch (err) {
    console.error("[readiness-score]", err);
    return NextResponse.json(errorResponse("Score calculation failed"), { status: 500 });
  }
}

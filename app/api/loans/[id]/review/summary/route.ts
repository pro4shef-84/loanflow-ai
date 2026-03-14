import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import type { Database } from "@/lib/types/database.types";
import { flashModel, MODELS, extractJson } from "@/lib/ai/client";
import type { OfficerReviewSummary } from "@/lib/domain/entities";

type Params = { params: Promise<{ id: string }> };
type LoanFileRow = Database["public"]["Tables"]["loan_files"]["Row"];
type RequirementRow = Database["public"]["Tables"]["document_requirements"]["Row"];
type EscalationRow = Database["public"]["Tables"]["escalations"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

type LoanWithRelations = LoanFileRow & {
  document_requirements: RequirementRow[];
  escalations: EscalationRow[];
  documents: DocumentRow[];
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

  // Fetch loan with all related data
  const { data: loanData, error: loanError } = await supabase
    .from("loan_files")
    .select("*, document_requirements(*), escalations(*), documents(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (loanError || !loanData) return NextResponse.json(errorResponse("Not found"), { status: 404 });

  const loan = loanData as unknown as LoanWithRelations;

  // Build context for Gemini
  const requirementsSummary = loan.document_requirements.map((r) => ({
    doc_type: r.doc_type,
    state: r.state,
  }));

  const openEscalations = loan.escalations.filter((e) => e.status === "open" || e.status === "acknowledged");

  const documentSummary = loan.documents.map((d) => ({
    type: d.type,
    status: d.status,
    confidence_score: d.confidence_score,
    issues: d.issues,
    original_filename: d.original_filename,
  }));

  const prompt = `You are an AI copilot assisting a mortgage loan officer. Analyze the following loan file data and provide a structured review summary.

Loan Details:
- ID: ${loan.id}
- Type: ${loan.loan_type}
- Status: ${loan.status}
- Document Workflow State: ${loan.doc_workflow_state ?? "unknown"}
- Property: ${loan.property_address ?? "N/A"}, ${loan.property_city ?? ""} ${loan.property_state ?? ""}

Document Requirements:
${JSON.stringify(requirementsSummary, null, 2)}

Open Escalations:
${JSON.stringify(openEscalations.map((e) => ({ category: e.category, severity: e.severity, description: e.description })), null, 2)}

Uploaded Documents:
${JSON.stringify(documentSummary, null, 2)}

Return a JSON object with this exact structure:
{
  "overall_status": "<one of: checklist_pending, awaiting_documents, documents_in_review, corrections_needed, borrower_unresponsive, officer_review_needed, review_ready, file_complete>",
  "unresolved_issues": ["<issue description>", ...],
  "confidence_flags": ["<flag description for low-confidence items>", ...],
  "recommended_actions": ["<what the officer should do next>", ...],
  "document_summaries": [
    {
      "doc_type": "<type>",
      "state": "<state>",
      "issues": ["<issue>", ...]
    }
  ]
}

Be concise and actionable. Focus on items that need the officer's attention.`;

  try {
    const result = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    if (!text) {
      return NextResponse.json(errorResponse("AI response was empty"), { status: 500 });
    }

    const summary = JSON.parse(extractJson(text)) as Omit<OfficerReviewSummary, "loan_file_id">;

    // Track token usage
    const usage = result.response.usageMetadata;
    await supabase.from("token_usage").insert({
      user_id: user.id,
      loan_file_id: id,
      module: "review-summary",
      model: MODELS.flash,
      input_tokens: usage?.promptTokenCount ?? 0,
      output_tokens: usage?.candidatesTokenCount ?? 0,
      cost_usd:
        ((usage?.promptTokenCount ?? 0) / 1_000_000) * 0.10 +
        ((usage?.candidatesTokenCount ?? 0) / 1_000_000) * 0.40,
    });

    return NextResponse.json(
      successResponse({
        loan_file_id: id,
        ...summary,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI summary generation failed";
    return NextResponse.json(errorResponse(message), { status: 500 });
  }
}

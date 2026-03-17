// ============================================================
// UNDERWRITING NARRATIVE AGENT
// Generates Fannie Mae / Freddie Mac formatted underwriting
// narratives with compensating factors for manual submission.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { proModel, extractJson } from "@/lib/ai/client";
import { maskObject } from "@/lib/utils/pii-masker";
import { trackTokenUsage } from "@/lib/utils/token-tracker";
import { estimateCost } from "@/lib/anthropic/token-router";
import type { Database } from "@/lib/types/database.types";

type LoanRow = Database["public"]["Tables"]["loan_files"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["loan_applications"]["Row"];

export interface NarrativeSection {
  title: string;
  content: string;
}

export interface UnderwritingNarrativeResult {
  loanNumber: string | null;
  borrowerName: string;
  propertyAddress: string;
  loanAmount: number | null;
  narrative: NarrativeSection[];
  compensatingFactors: string[];
  riskLayering: string[];
  recommendation: string;
  generatedAt: string;
}

function buildNarrativePrompt(context: Record<string, unknown>): string {
  return `You are an experienced mortgage underwriting specialist preparing a loan narrative for a manual underwriting submission or compensating factor letter. Generate a professional, Fannie Mae/Freddie Mac-compliant underwriting narrative.

Loan Context:
${JSON.stringify(context, null, 2)}

Generate a detailed underwriting narrative in the following JSON format:
{
  "narrative": [
    {
      "title": "Loan Overview",
      "content": "<2-3 sentence summary of the loan purpose, borrower profile, and property>"
    },
    {
      "title": "Borrower Profile",
      "content": "<employment stability, income history, credit overview>"
    },
    {
      "title": "Income Analysis",
      "content": "<qualifying income breakdown, income stability, self-employment if applicable>"
    },
    {
      "title": "Asset Position",
      "content": "<reserves, down payment source, asset adequacy>"
    },
    {
      "title": "Property Analysis",
      "content": "<property type, LTV, occupancy, marketability>"
    },
    {
      "title": "Risk Assessment",
      "content": "<overall risk summary, layering concerns if any>"
    },
    {
      "title": "Compensating Factors",
      "content": "<specific compensating factors that mitigate any elevated risk>"
    }
  ],
  "compensatingFactors": [
    "<list of specific compensating factors as bullet points>"
  ],
  "riskLayering": [
    "<list of risk layers present, or empty array if none>"
  ],
  "recommendation": "<APPROVE | APPROVE WITH CONDITIONS | REFER — with one sentence rationale>"
}

Guidelines:
- Write in formal underwriting language
- Be specific with numbers (use the actual loan data provided)
- Identify genuine compensating factors (low LTV, strong reserves, long employment, etc.)
- Note any risk layering (high DTI + lower credit + investment property, etc.)
- Keep each section concise but substantive (3-5 sentences)
- Do not fabricate specific numbers — use "not provided" if data is missing`;
}

export class UnderwritingNarrativeAgent {
  async generate(loanFileId: string, userId: string): Promise<UnderwritingNarrativeResult> {
    const supabase = await createClient();

    // Fetch loan file with full context
    const { data: loanRaw } = await supabase
      .from("loan_files")
      .select("*")
      .eq("id", loanFileId)
      .eq("user_id", userId)
      .single();

    const loan = loanRaw as unknown as LoanRow | null;
    if (!loan) throw new Error("Loan file not found");

    // Fetch loan application data (1003)
    const { data: applicationRaw } = await supabase
      .from("loan_applications")
      .select("*")
      .eq("loan_file_id", loanFileId)
      .single();

    const application = applicationRaw as unknown as ApplicationRow | null;

    // Fetch verified documents summary
    const { data: documents } = await supabase
      .from("documents")
      .select("type, status, confidence_score")
      .eq("loan_file_id", loanFileId)
      .eq("status", "verified");

    // Fetch open conditions
    const { data: conditions } = await supabase
      .from("conditions")
      .select("plain_english_summary, status, priority")
      .eq("loan_file_id", loanFileId)
      .not("status", "in", '("cleared","waived")');

    // Fetch escalations
    const { data: escalations } = await supabase
      .from("escalations")
      .select("category, severity, description")
      .eq("loan_file_id", loanFileId)
      .eq("status", "open");

    // Build context object (mask PII before sending to AI)
    const rawContext = {
      loan: {
        loan_type: loan.loan_type,
        loan_purpose: loan.loan_purpose,
        loan_amount: loan.loan_amount,
        estimated_value: loan.estimated_value,
        ltv: loan.loan_amount && loan.estimated_value
          ? ((loan.loan_amount / loan.estimated_value) * 100).toFixed(1) + "%"
          : "not calculated",
        property_city: loan.property_city,
        property_state: loan.property_state,
        status: loan.status,
        file_number: loan.file_number,
        closing_date: loan.closing_date,
        rate_lock_expires_at: loan.rate_lock_expires_at,
      },
      borrower: application ? {
        marital_status: application.borrower_marital_status,
        dependents: application.borrower_dependents,
        citizenship: application.borrower_citizenship,
        housing: application.current_housing,
        years_at_address: application.years_at_address,
        employer_name: application.employer_name,
        job_title: application.job_title,
        employment_start_date: application.employment_start_date,
        years_employed: application.years_employed,
        self_employed: application.self_employed,
        base_income: application.base_income,
        overtime_income: application.overtime_income,
        bonus_income: application.bonus_income,
        commission_income: application.commission_income,
        other_income: application.other_income,
        checking_balance: application.checking_balance,
        savings_balance: application.savings_balance,
        retirement_balance: application.retirement_balance,
        has_co_borrower: !!application.co_borrower,
        declarations: {
          outstanding_judgments: application.outstanding_judgments,
          declared_bankruptcy: application.declared_bankruptcy,
          property_foreclosed: application.property_foreclosed,
          party_to_lawsuit: application.party_to_lawsuit,
          delinquent_federal_debt: application.delinquent_federal_debt,
        },
      } : null,
      documents_verified: (documents ?? []).map((d) => d.type),
      open_conditions: (conditions ?? []).map((c) => ({
        summary: c.plain_english_summary,
        priority: c.priority,
        status: c.status,
      })),
      open_escalations: (escalations ?? []).map((e) => ({
        category: e.category,
        severity: e.severity,
      })),
    };

    const maskedContext = maskObject(rawContext) as Record<string, unknown>;
    const prompt = buildNarrativePrompt(maskedContext);

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const parsed = JSON.parse(extractJson(text)) as {
      narrative: NarrativeSection[];
      compensatingFactors: string[];
      riskLayering: string[];
      recommendation: string;
    };

    // Track token usage
    const usage = result.response.usageMetadata;
    await trackTokenUsage({
      userId,
      module: "underwriting-narrative",
      model: "gemini-2.0-flash",
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      costUsd: estimateCost("validate-condition", usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0),
    });

    // Log event
    await supabase.from("file_completion_events").insert({
      loan_file_id: loanFileId,
      event_type: "underwriting_narrative_generated",
      actor: userId,
      payload: { sections: parsed.narrative.map((s) => s.title) },
    });

    const borrowerName = application
      ? `${application.borrower_first_name ?? ""} ${application.borrower_last_name ?? ""}`.trim() || "Borrower"
      : "Borrower";

    return {
      loanNumber: loan.file_number,
      borrowerName,
      propertyAddress: [loan.property_address, loan.property_city, loan.property_state]
        .filter(Boolean).join(", ") || "Not specified",
      loanAmount: loan.loan_amount,
      narrative: parsed.narrative,
      compensatingFactors: parsed.compensatingFactors,
      riskLayering: parsed.riskLayering,
      recommendation: parsed.recommendation,
      generatedAt: new Date().toISOString(),
    };
  }
}

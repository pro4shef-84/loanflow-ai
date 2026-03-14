import type { DocWorkflowState, DocumentRequirementState } from "@/lib/domain/enums";

/**
 * File completion summary data injected into the readiness score prompt.
 */
export interface FileCompletionContext {
  docWorkflowState: DocWorkflowState | string | null;
  totalRequirements: number;
  satisfiedRequirements: number;
  correctionRequired: number;
  openEscalations: number;
  requirementDetails: Array<{
    docType: string;
    state: DocumentRequirementState | string;
  }>;
}

/**
 * Build the file completion section of the prompt.
 */
function buildFileCompletionSection(ctx: FileCompletionContext | undefined): string {
  if (!ctx || ctx.totalRequirements === 0) return "";

  const pctSatisfied =
    ctx.totalRequirements > 0
      ? Math.round((ctx.satisfiedRequirements / ctx.totalRequirements) * 100)
      : 0;

  const lines = [
    `\n\nFile Completion Engine Data:`,
    `- Document Workflow State: ${ctx.docWorkflowState ?? "unknown"}`,
    `- Requirements Satisfied: ${ctx.satisfiedRequirements}/${ctx.totalRequirements} (${pctSatisfied}%)`,
    `- Corrections Pending: ${ctx.correctionRequired}`,
    `- Open Escalations: ${ctx.openEscalations}`,
  ];

  if (ctx.requirementDetails.length > 0) {
    lines.push(`- Requirement Breakdown:`);
    for (const req of ctx.requirementDetails) {
      lines.push(`  - ${req.docType}: ${req.state}`);
    }
  }

  lines.push(
    `\nIMPORTANT: Factor the file completion data into the Documents score (30 pts).`,
    `- If requirements satisfaction is below 100%, deduct proportionally from the document score.`,
    `- Each open escalation is a potential blocker — deduct 3 pts per open escalation.`,
    `- Each pending correction deducts 2 pts from the document score.`,
    `- If doc_workflow_state is "file_complete", give full document score (assuming other data supports it).`,
    `- If doc_workflow_state is "borrower_unresponsive", add a blocker.`
  );

  return lines.join("\n");
}

export function buildReadinessScorePrompt(
  loanData: unknown,
  fileCompletionCtx?: FileCompletionContext
): string {
  const fileCompletionSection = buildFileCompletionSection(fileCompletionCtx);

  return `You are a mortgage loan readiness analyst. Score this loan file on its readiness to submit to underwriting.

Score each category and return a JSON object:
{
  "score": <0-100>,
  "grade": "<A|B|C|F>",
  "breakdown": {
    "documents": {
      "score": <0-30>,
      "max": 30,
      "issues": [{ "field": "<field>", "message": "<message>", "severity": "<blocker|warning>" }]
    },
    "income": {
      "score": <0-30>,
      "max": 30,
      "issues": []
    },
    "assets": {
      "score": <0-20>,
      "max": 20,
      "issues": []
    },
    "application": {
      "score": <0-20>,
      "max": 20,
      "issues": []
    }
  },
  "blockers": [{ "field": "<field>", "message": "<message>", "severity": "blocker" }],
  "warnings": [{ "field": "<field>", "message": "<message>", "severity": "warning" }],
  "ready_to_submit": <boolean>
}

Scoring rubric:
- Documents (30 pts): All required docs present and verified = 30. Deduct for each missing/unverified doc.
- Income (30 pts): Qualifying income calculated, no red flags = 30. Deduct for gaps, inconsistencies.
- Assets (20 pts): Sufficient for down payment + closing costs + 2mo reserves = 20. Deduct for shortfalls.
- Application (20 pts): No missing required 1003 fields, no inconsistencies = 20. Deduct for each issue.

Grade: A=90-100, B=75-89, C=60-74, F=below 60
ready_to_submit = true only if score >= 80 and no blockers.
${fileCompletionSection}
Loan File Data:
${JSON.stringify(loanData, null, 2)}`;
}

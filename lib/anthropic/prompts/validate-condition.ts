export function buildValidateConditionPrompt(
  conditionText: string,
  documentData: unknown
): string {
  return `You are a mortgage underwriting conditions validator. Determine if the provided document satisfies the given lender condition.

Return a JSON object:
{
  "satisfied": <boolean>,
  "confidence": <0.0-1.0>,
  "explanation": "<brief explanation of why it is or is not satisfied>",
  "gaps": ["<list of what is still missing or insufficient>"],
  "recommendation": "<submit|needs_attention|request_different_document>"
}

Lender Condition:
${conditionText}

Document Data (extracted):
${JSON.stringify(documentData, null, 2)}

Be thorough but practical. If the document substantially satisfies the condition, mark it satisfied. Note any minor gaps as warnings rather than blockers.`;
}

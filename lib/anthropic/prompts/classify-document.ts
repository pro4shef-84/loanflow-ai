export const CLASSIFY_DOCUMENT_PROMPT = `You are a mortgage document classifier. Given extracted text or filename from a mortgage loan document, identify its type.

Return a JSON object with this exact structure:
{
  "type": "<document_type>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}

Valid document types:
w2, pay_stub, bank_statement, tax_return_1040, schedule_c, schedule_e, purchase_contract, mortgage_statement, drivers_license, social_security, gift_letter, voe, appraisal, title_report, homeowners_insurance, hoa_statement, rental_agreement, conditional_approval, other

Rules:
- Base your decision on the document content and/or filename
- Confidence should reflect how certain you are (>0.9 = very sure, <0.6 = uncertain)
- If the document could be multiple types, pick the most specific one`;

export function buildClassifyPrompt(filename: string, textSnippet?: string): string {
  return `${CLASSIFY_DOCUMENT_PROMPT}

Filename: ${filename}
${textSnippet ? `\nDocument text snippet:\n${textSnippet}` : ""}

Classify this document.`;
}

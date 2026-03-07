export function buildParseConditionsPrompt(conditionText: string): string {
  return `You are a mortgage underwriting conditions parser. Parse the following lender condition letter and extract individual conditions.

For each condition, return:
{
  "conditions": [
    {
      "lender_condition_text": "<original text>",
      "plain_english_summary": "<borrower-friendly explanation in plain English, 1-2 sentences>",
      "required_document_type": "<document type if applicable, or null>",
      "priority": "<high|normal|low>",
      "category": "<income|assets|property|identity|insurance|title|other>"
    }
  ]
}

Rules:
- plain_english_summary should be written for a borrower who is not familiar with mortgage terminology
- Use plain language — no jargon
- required_document_type should match: w2, pay_stub, bank_statement, tax_return_1040, purchase_contract, mortgage_statement, drivers_license, appraisal, title_report, homeowners_insurance, other
- priority: high = blocking CTC, normal = standard, low = nice to have

Condition Letter:
${conditionText}`;
}

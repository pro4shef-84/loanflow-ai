export function buildCalculateIncomePrompt(documents: unknown[]): string {
  return `You are a mortgage underwriting income calculator. Analyze the provided income documents and calculate qualifying income according to standard agency guidelines (Fannie Mae/Freddie Mac).

Return a JSON object with this structure:
{
  "qualifying_monthly_income": <number>,
  "income_sources": [
    {
      "type": "<salary|hourly|self_employment|rental|other>",
      "description": "<description>",
      "monthly_amount": <number>,
      "calculation_method": "<how you calculated this>"
    }
  ],
  "income_history_adequate": <boolean>,
  "likely_to_continue": <boolean>,
  "issues": [
    { "severity": "<warning|blocker>", "message": "<description>" }
  ],
  "notes": "<any important underwriter notes>"
}

Income Documents:
${JSON.stringify(documents, null, 2)}

Calculate qualifying income using the most conservative compliant method. Flag any issues that an underwriter would flag.`;
}

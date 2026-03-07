export function buildReadinessScorePrompt(loanData: unknown): string {
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

Loan File Data:
${JSON.stringify(loanData, null, 2)}`;
}

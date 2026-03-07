export function buildPulseReasoningPrompt(contact: unknown, eventType: string, eventData: unknown): string {
  return `You are a mortgage loan officer's AI assistant analyzing whether a past client is ready for outreach.

Evaluate if now is a good time to reach out to this contact, and if so, what the outreach angle should be.

Return a JSON object:
{
  "should_reach_out": <boolean>,
  "urgency": "<high|medium|low>",
  "reasoning": "<1-2 sentence explanation of why this is or isn't a good time>",
  "suggested_angle": "<brief description of what to say/offer>",
  "suggested_message_type": "<refinance_opportunity|equity_discussion|rate_alert|anniversary_checkin|general_touch>",
  "estimated_value": "<rough estimate of potential deal value or 'unknown'>"
}

Event Type: ${eventType}
Event Data: ${JSON.stringify(eventData, null, 2)}

Contact:
${JSON.stringify(contact, null, 2)}

Be realistic. Only recommend outreach when there is a genuine opportunity. Consider interest rate environment, equity position, time since last contact, and loan age.`;
}

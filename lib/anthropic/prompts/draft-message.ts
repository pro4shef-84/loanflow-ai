export type MessageTone = "professional" | "friendly" | "urgent";
export type RecipientType = "borrower" | "realtor" | "title" | "lo";
export type MessageChannel = "sms" | "email";

export interface DraftMessageParams {
  purpose: string;
  recipientType: RecipientType;
  channel: MessageChannel;
  tone: MessageTone;
  loanContext?: string;
  specificInstructions?: string;
}

export function buildDraftMessagePrompt(params: DraftMessageParams): string {
  const lengthGuidance = params.channel === "sms"
    ? "Keep it under 160 characters if possible. Be concise."
    : "Write a clear, professional email. Include a subject line.";

  return `You are a mortgage loan officer assistant. Draft a ${params.channel} message.

Recipient: ${params.recipientType}
Tone: ${params.tone}
Purpose: ${params.purpose}
${params.loanContext ? `\nLoan Context:\n${params.loanContext}` : ""}
${params.specificInstructions ? `\nSpecific Instructions: ${params.specificInstructions}` : ""}

${lengthGuidance}

Return a JSON object:
{
  "subject": "<email subject or null for SMS>",
  "content": "<message body>",
  "suggested_followup": "<optional: suggested next action after sending>"
}

The message should sound human and helpful, not automated. Do not use placeholder brackets like [NAME] — write it as if you know the context.`;
}

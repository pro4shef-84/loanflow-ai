/**
 * @deprecated — Anthropic client is no longer used.
 * All AI features have been migrated to Google Gemini.
 * See lib/ai/client.ts for the active AI client.
 */

export const MODELS = {
  haiku: "gemini-2.0-flash",
  sonnet: "gemini-2.0-flash",
} as const;

export type ModelKey = keyof typeof MODELS;

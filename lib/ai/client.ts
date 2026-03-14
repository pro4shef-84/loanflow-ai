import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/** Fast model for classification, extraction, drafts */
export const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/** For complex reasoning (AUS, readiness, copilot summaries) */
export const proModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export { genAI };

/**
 * Model name constants for token tracking.
 */
export const MODELS = {
  flash: "gemini-2.0-flash",
  pro: "gemini-2.0-flash",
} as const;

export type ModelKey = keyof typeof MODELS;

/** Strip markdown code blocks that Gemini may wrap around JSON responses. */
export function extractJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

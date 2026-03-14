/**
 * Token router — maps AI tasks to Gemini models and estimates cost.
 * Migrated from Anthropic Claude to Google Gemini.
 */

import { MODELS, type ModelKey } from "@/lib/ai/client";

export type TaskType =
  | "classify-document"
  | "draft-status-message"
  | "condition-plain-english"
  | "pulse-summary"
  | "income-calculation"
  | "readiness-score"
  | "parse-conditions"
  | "validate-condition"
  | "non-qm-qa";

const TASK_MODEL_MAP: Record<TaskType, ModelKey> = {
  // Flash tasks — fast, cheap, straightforward
  "classify-document": "flash",
  "draft-status-message": "flash",
  "condition-plain-english": "flash",
  "pulse-summary": "flash",

  // Pro tasks — complex reasoning required
  "income-calculation": "pro",
  "readiness-score": "pro",
  "parse-conditions": "pro",
  "validate-condition": "pro",
  "non-qm-qa": "pro",
};

export function getModelForTask(task: TaskType): string {
  const key = TASK_MODEL_MAP[task];
  return MODELS[key];
}

/**
 * Approximate cost per 1M tokens (USD) for Gemini 2.0 Flash.
 * Gemini pricing: input $0.10/1M, output $0.40/1M (as of 2026-03).
 */
const COST_PER_1M: Record<ModelKey, { input: number; output: number }> = {
  flash: { input: 0.10, output: 0.40 },
  pro: { input: 0.10, output: 0.40 },
};

export function estimateCost(
  task: TaskType,
  inputTokens: number,
  outputTokens: number
): number {
  const key = TASK_MODEL_MAP[task];
  const rates = COST_PER_1M[key];
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

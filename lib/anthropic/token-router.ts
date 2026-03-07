import { MODELS, type ModelKey } from "./client";

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
  // Haiku tasks — fast, cheap, straightforward
  "classify-document": "haiku",
  "draft-status-message": "haiku",
  "condition-plain-english": "haiku",
  "pulse-summary": "haiku",

  // Sonnet tasks — complex reasoning required
  "income-calculation": "sonnet",
  "readiness-score": "sonnet",
  "parse-conditions": "sonnet",
  "validate-condition": "sonnet",
  "non-qm-qa": "sonnet",
};

export function getModelForTask(task: TaskType): string {
  const key = TASK_MODEL_MAP[task];
  return MODELS[key];
}

// Approximate cost per 1M tokens (USD)
const COST_PER_1M: Record<ModelKey, { input: number; output: number }> = {
  haiku: { input: 0.80, output: 4.0 },
  sonnet: { input: 3.0, output: 15.0 },
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

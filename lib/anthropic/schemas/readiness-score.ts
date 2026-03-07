import { z } from "zod";

export const ReadinessIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.enum(["blocker", "warning"]),
});

export const ReadinessCategorySchema = z.object({
  score: z.number(),
  max: z.number(),
  issues: z.array(ReadinessIssueSchema).default([]),
});

export const ReadinessScoreSchema = z.object({
  score: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "F"]),
  breakdown: z.object({
    documents: ReadinessCategorySchema,
    income: ReadinessCategorySchema,
    assets: ReadinessCategorySchema,
    application: ReadinessCategorySchema,
  }),
  blockers: z.array(ReadinessIssueSchema).default([]),
  warnings: z.array(ReadinessIssueSchema).default([]),
  ready_to_submit: z.boolean(),
});

export type ReadinessScoreResult = z.infer<typeof ReadinessScoreSchema>;

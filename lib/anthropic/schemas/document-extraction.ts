import { z } from "zod";

export const DocumentClassificationSchema = z.object({
  type: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const VerificationFlagSchema = z.object({
  type: z.enum(["warning", "error", "info"]),
  field: z.string(),
  message: z.string(),
});

export const DocumentExtractionSchema = z.object({
  confidence: z.number().min(0).max(1),
  flags: z.array(VerificationFlagSchema).default([]),
}).passthrough();

export type DocumentClassification = z.infer<typeof DocumentClassificationSchema>;
export type DocumentExtraction = z.infer<typeof DocumentExtractionSchema>;

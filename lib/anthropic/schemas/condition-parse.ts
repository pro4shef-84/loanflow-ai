import { z } from "zod";

export const ParsedConditionSchema = z.object({
  lender_condition_text: z.string(),
  plain_english_summary: z.string(),
  required_document_type: z.string().nullable(),
  priority: z.enum(["high", "normal", "low"]),
  category: z.enum(["income", "assets", "property", "identity", "insurance", "title", "other"]),
});

export const ParseConditionsResponseSchema = z.object({
  conditions: z.array(ParsedConditionSchema),
});

export type ParsedCondition = z.infer<typeof ParsedConditionSchema>;
export type ParseConditionsResponse = z.infer<typeof ParseConditionsResponseSchema>;

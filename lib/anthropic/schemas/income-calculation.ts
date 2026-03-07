import { z } from "zod";

export const IncomeSourceSchema = z.object({
  type: z.enum(["salary", "hourly", "self_employment", "rental", "other"]),
  description: z.string(),
  monthly_amount: z.number(),
  calculation_method: z.string(),
});

export const IncomeIssueSchema = z.object({
  severity: z.enum(["warning", "blocker"]),
  message: z.string(),
});

export const IncomeCalculationSchema = z.object({
  qualifying_monthly_income: z.number(),
  income_sources: z.array(IncomeSourceSchema),
  income_history_adequate: z.boolean(),
  likely_to_continue: z.boolean(),
  issues: z.array(IncomeIssueSchema).default([]),
  notes: z.string().optional(),
});

export type IncomeCalculation = z.infer<typeof IncomeCalculationSchema>;

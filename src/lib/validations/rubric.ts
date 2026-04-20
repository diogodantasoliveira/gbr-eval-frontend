import { z } from "zod";

export const createRubricSchema = z.object({
  name: z.string().min(1).max(100),
  skill_id: z.string().optional().nullable(),
  category: z.enum(["extraction", "classification", "decision", "general"]),
  rubric_text: z.string().default(""),
  min_score: z.number().min(1.0).max(5.0).default(3.0),
  model: z.string().default("claude-sonnet-4-5-20250514"),
  status: z.enum(["draft", "active", "deprecated"]).default("draft"),
});

export const updateRubricSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  skill_id: z.string().nullable().optional(),
  category: z.enum(["extraction", "classification", "decision", "general"]).optional(),
  rubric_text: z.string().optional(),
  min_score: z.number().min(1.0).max(5.0).optional(),
  model: z.string().optional(),
  status: z.enum(["draft", "active", "deprecated"]).optional(),
  promotion_status: z.enum(["informative", "blocking"]).optional(),
  change_reason: z.string().optional(),
  version: z.number().int().optional(),
});

export const createCriterionSchema = z.object({
  criterion: z.string().min(1),
  weight: z.number().min(0).default(1.0),
  score_anchor_low: z.string().default(""),
  score_anchor_high: z.string().default(""),
  sort_order: z.number().int().default(0),
});

export const updateCriterionSchema = z.object({
  criterion: z.string().min(1).optional(),
  weight: z.number().min(0).optional(),
  score_anchor_low: z.string().optional(),
  score_anchor_high: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export const createExampleSchema = z.object({
  input_data: z.record(z.string(), z.unknown()).default({}),
  output_data: z.record(z.string(), z.unknown()).default({}),
  expected_score: z.number().int().min(1).max(5),
  reasoning: z.string().default(""),
  sort_order: z.number().int().default(0),
});

export const updateExampleSchema = z.object({
  input_data: z.record(z.string(), z.unknown()).optional(),
  output_data: z.record(z.string(), z.unknown()).optional(),
  expected_score: z.number().int().min(1).max(5).optional(),
  reasoning: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateRubricInput = z.infer<typeof createRubricSchema>;
export type UpdateRubricInput = z.infer<typeof updateRubricSchema>;
export type CreateCriterionInput = z.infer<typeof createCriterionSchema>;
export type UpdateCriterionInput = z.infer<typeof updateCriterionSchema>;
export type CreateExampleInput = z.infer<typeof createExampleSchema>;
export type UpdateExampleInput = z.infer<typeof updateExampleSchema>;

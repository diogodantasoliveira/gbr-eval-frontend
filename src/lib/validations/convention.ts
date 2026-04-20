import { z } from "zod";

export const conventionCategoryEnum = z.enum([
  "tenant_isolation",
  "naming",
  "architecture",
  "security",
  "data_handling",
  "api_design",
]);

export const conventionSeverityEnum = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const conventionDetectionTypeEnum = z.enum(["regex", "ast", "llm_judge"]);

export const createConventionSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscores"),
  category: conventionCategoryEnum,
  severity: conventionSeverityEnum.default("medium"),
  description: z.string().optional().default(""),
  detection_pattern: z.string().optional().default(""),
  detection_type: conventionDetectionTypeEnum.default("regex"),
  positive_example: z.string().optional().default(""),
  negative_example: z.string().optional().default(""),
  source: z.string().optional().default(""),
});

export const updateConventionSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscores")
    .optional(),
  category: conventionCategoryEnum.optional(),
  severity: conventionSeverityEnum.optional(),
  description: z.string().optional(),
  detection_pattern: z.string().optional(),
  detection_type: conventionDetectionTypeEnum.optional(),
  positive_example: z.string().optional(),
  negative_example: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["active", "deprecated"]).optional(),
});

export type CreateConventionInput = z.infer<typeof createConventionSchema>;
export type UpdateConventionInput = z.infer<typeof updateConventionSchema>;

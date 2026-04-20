import { z } from "zod";
import { isValidRegex } from "@/lib/validations/regex";

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  doc_type: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver (e.g. 1.0.0)"),
  description: z.string().optional().default(""),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  status: z.enum(["active", "deprecated"]).default("active"),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  doc_type: z.string().min(1).max(50).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver (e.g. 1.0.0)").optional(),
  description: z.string().optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  status: z.enum(["active", "deprecated"]).optional(),
});

const safePattern = z.string().refine(
  (p) => isValidRegex(p).valid,
  "Pattern fails ReDoS safety check"
).nullable().optional();

export const createFieldSchema = z.object({
  field_name: z.string().min(1).max(100),
  field_type: z.enum(["string", "number", "boolean", "date", "list", "nested"]),
  criticality: z.enum(["CRITICAL", "IMPORTANT", "INFORMATIVE"]),
  required: z.boolean().default(true),
  validation_pattern: safePattern,
  description: z.string().optional().default(""),
});

export const updateFieldSchema = z.object({
  field_name: z.string().min(1).max(100).optional(),
  field_type: z.enum(["string", "number", "boolean", "date", "list", "nested"]).optional(),
  criticality: z.enum(["CRITICAL", "IMPORTANT", "INFORMATIVE"]).optional(),
  required: z.boolean().optional(),
  validation_pattern: safePattern,
  description: z.string().optional(),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;

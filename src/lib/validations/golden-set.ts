import { z } from "zod";

export const createGoldenSetSchema = z.object({
  skill_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
});

export const updateGoldenSetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "annotated", "reviewed", "approved"]).optional(),
});

export const createCaseSchema = z.object({
  document_hash: z.string().optional().default("sha256:PENDING_COMPUTE"),
  document_source: z.string().optional().default(""),
  annotator: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  expected_output: z.record(z.string(), z.unknown()).optional().default({}),
  citation: z.record(z.string(), z.unknown()).optional().default({}),
  input_data: z.record(z.string(), z.unknown()).optional().default({}),
  field_annotations: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateCaseSchema = z.object({
  document_hash: z.string().optional(),
  document_source: z.string().optional(),
  annotator: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  expected_output: z.record(z.string(), z.unknown()).optional(),
  citation: z.record(z.string(), z.unknown()).optional(),
  input_data: z.record(z.string(), z.unknown()).optional(),
  field_annotations: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "annotated", "reviewed", "approved"]).optional(),
  change_reason: z.string().optional(),
});

export const importCaseSchema = z.object({
  case_number: z.number().int().positive().optional(),
  document_hash: z.string().optional(),
  tags: z.array(z.string()).optional(),
  annotator: z.string().optional(),
  reviewed_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
  document_source: z.string().optional(),
  notes: z.string().optional(),
  expected_output: z.record(z.string(), z.unknown()).optional(),
  citation: z.record(z.string(), z.unknown()).optional(),
});

export const importCasesSchema = z.array(importCaseSchema).min(1).max(1000);

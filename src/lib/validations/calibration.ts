import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createSessionSchema = z.object({
  skill_id: z.string().regex(UUID_RE, "Must be a valid UUID"),
  golden_set_id: z.string().regex(UUID_RE, "Must be a valid UUID"),
  annotator_1: z.string().min(1).max(100),
  annotator_2: z.string().min(1).max(100),
});

export const createAnnotationSchema = z.object({
  case_id: z.string().regex(UUID_RE, "Must be a valid UUID"),
  annotator: z.string().min(1).max(100),
  annotations: z.record(z.string(), z.unknown()),
});

export const resolveDisagreementSchema = z.object({
  disagreement_id: z.string().regex(UUID_RE, "Must be a valid UUID"),
  resolution: z.string().min(1),
  resolved_by: z.string().min(1).max(100),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type ResolveDisagreementInput = z.infer<typeof resolveDisagreementSchema>;

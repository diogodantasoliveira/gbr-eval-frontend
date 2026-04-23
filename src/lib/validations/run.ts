import { z } from "zod";

const graderResultSchema = z.object({
  grader_type: z.string(),
  field: z.string().optional(),
  passed: z.boolean(),
  score: z.number(),
  weight: z.number().optional(),
  required: z.boolean().optional(),
  details: z.string().optional(),
  severity: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
});

const taskResultSchema = z.object({
  task_id: z.string(),
  passed: z.boolean(),
  score: z.number(),
  duration_ms: z.number().optional(),
  pass_threshold: z.number().optional(),
  error: z.string().nullable().optional(),
  grader_results: z.array(graderResultSchema).default([]),
  reducer_scores: z.record(z.string(), z.number()).optional().default({}),
  epoch_scores: z.array(z.number()).optional().default([]),
});

export const importRunSchema = z.object({
  run_id: z.string().min(1),
  layer: z.string().min(1),
  tier: z.string().nullable().optional(),
  started_at: z.string(),
  finished_at: z.string().optional(),
  tasks_total: z.number().int().min(0),
  tasks_passed: z.number().int().min(0),
  tasks_failed: z.number().int().min(0),
  overall_score: z.number().min(0).max(1),
  gate_result: z.enum(["go", "conditional_go", "no_go", "no_go_absolute"]).optional(),
  baseline_run_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  task_results: z.array(taskResultSchema).max(10000).default([]),
  newly_failing: z.array(z.string()).default([]),
  newly_passing: z.array(z.string()).default([]),
  stable_pass: z.array(z.string()).default([]),
  stable_fail: z.array(z.string()).default([]),
});

export type ImportRunInput = z.infer<typeof importRunSchema>;

export function deriveRegressionStatus(
  taskId: string,
  newlyFailing: string[],
  newlyPassing: string[],
  stablePass: string[],
  stableFail: string[]
): string | null {
  if (newlyFailing.includes(taskId)) return "new_failure";
  if (newlyPassing.includes(taskId)) return "new_pass";
  if (stablePass.includes(taskId)) return "stable_pass";
  if (stableFail.includes(taskId)) return "stable_fail";
  return null;
}

export interface SeverityThresholds {
  critical: number;
  high: number;
  medium: number;
}

const DEFAULT_SEVERITY_THRESHOLDS: SeverityThresholds = { critical: 0.5, high: 0.7, medium: 0.9 };

export function deriveSeverity(
  score: number,
  passed: boolean,
  thresholds: SeverityThresholds = DEFAULT_SEVERITY_THRESHOLDS
): string {
  if (!passed && score < thresholds.critical) return "critical";
  if (!passed && score < thresholds.high) return "high";
  if (!passed || score < thresholds.medium) return "medium";
  return "low";
}

export const createPostmortemSchema = z.object({
  task_id: z.string().optional(),
  what: z.string().min(1),
  root_cause: z.string().min(1),
  impact: z.string().min(1),
  fix: z.string().min(1),
  prevention: z.string().min(1),
  created_by: z.string().default("system"),
});

export type CreatePostmortemInput = z.infer<typeof createPostmortemSchema>;

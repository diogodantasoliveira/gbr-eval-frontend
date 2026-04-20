import { z } from "zod";

// Enums matching backend models.py
export const categoryEnum = z.enum([
  "classification",
  "extraction",
  "decision",
  "citation",
  "cost",
  "latency",
  "code_quality",
  "tenant_isolation",
  "convention",
]);

export const layerEnum = z.enum(["engineering", "product", "operational", "compliance"]);
export const tierEnum = z.enum(["gate", "regression", "canary"]);
export const scoringModeEnum = z.enum(["weighted", "binary", "hybrid"]);
export const scoreReducerEnum = z.enum(["mean", "at_least_one", "all_pass", "majority", "median"]);
export const taskStatusEnum = z.enum(["draft", "active", "deprecated"]);

// EVAL First checklist - 7 mandatory questions
export const evalChecklistSchema = z.object({
  success_criteria: z.string().min(1, "Required"),
  measurement: z.string().min(1, "Required"),
  baseline: z.string().min(1, "Required"),
  gate_threshold: z.string().min(1, "Required"),
  target_threshold: z.string().min(1, "Required"),
  regression_signal: z.string().min(1, "Required"),
  governance: z.string().min(1, "Required"),
});

export type EvalChecklist = z.infer<typeof evalChecklistSchema>;

export const EVAL_CHECKLIST_QUESTIONS: Array<{
  key: keyof EvalChecklist;
  label: string;
  placeholder: string;
}> = [
  {
    key: "success_criteria",
    label: "What does success look like?",
    placeholder: "Describe the expected successful outcome...",
  },
  {
    key: "measurement",
    label: "How will you measure it?",
    placeholder: "Describe the measurement method...",
  },
  {
    key: "baseline",
    label: "What is the baseline?",
    placeholder: "Current baseline performance or reference...",
  },
  {
    key: "gate_threshold",
    label: "What is the gate threshold?",
    placeholder: "Minimum score to pass (e.g. 0.95)...",
  },
  {
    key: "target_threshold",
    label: "What is the target threshold?",
    placeholder: "Target/ideal score to achieve...",
  },
  {
    key: "regression_signal",
    label: "What would indicate regression?",
    placeholder: "Conditions that would flag a regression...",
  },
  {
    key: "governance",
    label: "Who owns this eval?",
    placeholder: "Team or person responsible for this eval...",
  },
];

// Grader types from backend registry (12 graders)
export const graderTypeEnum = z.enum([
  "exact_match",
  "numeric_range",
  "numeric_tolerance",
  "regex_match",
  "field_not_empty",
  "set_membership",
  "string_contains",
  "field_f1",
  "llm_judge",
  "pattern_required",
  "pattern_forbidden",
  "convention_check",
]);

export type GraderType = z.infer<typeof graderTypeEnum>;

// Per-grader config schemas (must match backend config keys exactly)
export const exactMatchConfigSchema = z.object({
  case_sensitive: z.boolean().optional().default(true),
});
export const numericRangeConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  allow_null: z.boolean().optional().default(false),
});
export const numericToleranceConfigSchema = z.object({
  tolerance: z.number().min(0),
  allow_null: z.boolean().optional().default(false),
});
export const regexMatchConfigSchema = z.object({
  pattern: z.string().min(1),
});
export const fieldNotEmptyConfigSchema = z.object({});
export const setMembershipConfigSchema = z.object({
  valid_values: z.array(z.string()),
});
export const stringContainsConfigSchema = z.object({
  substring: z.string().min(1),
  case_sensitive: z.boolean().optional().default(true),
});
export const fieldF1ConfigSchema = z.object({
  scope: z.enum(["all", "critical_only"]).optional().default("all"),
  critical_fields: z.array(z.string()).optional().default([]),
  fuzzy_ratio: z.number().min(0).max(1).optional().default(0.85),
  numeric_tolerance: z.number().min(0).optional().default(0.01),
  f1_threshold: z.number().min(0).max(1).optional().default(0.90),
});
export const llmJudgeConfigSchema = z.object({
  rubric_id: z.string().min(1),
  model: z.string().optional().default("claude-sonnet-4-5-20250514"),
});
export const patternRequiredConfigSchema = z.object({
  pattern: z.string().min(1),
  file_key: z.string().optional().default("content"),
});
export const patternForbiddenConfigSchema = z.object({
  pattern: z.string().min(1),
  file_key: z.string().optional().default("content"),
});
export const conventionCheckConfigSchema = z.object({
  rules: z.array(z.object({
    pattern: z.string(),
    type: z.enum(["required", "forbidden"]),
    description: z.string().optional(),
  })),
  file_key: z.string().optional().default("content"),
});

export const createTaskGraderSchema = z.object({
  grader_type: graderTypeEnum,
  field: z.string().nullable().optional(),
  weight: z.number().min(0).default(1.0),
  required: z.boolean().default(false),
  config: z.record(z.string(), z.unknown()).default({}),
  model_role: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
});

export const updateTaskGraderSchema = z.object({
  grader_type: graderTypeEnum.optional(),
  field: z.string().nullable().optional(),
  weight: z.number().min(0).optional(),
  required: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  model_role: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type CreateTaskGraderInput = z.infer<typeof createTaskGraderSchema>;
export type UpdateTaskGraderInput = z.infer<typeof updateTaskGraderSchema>;

// Task input schema
export const taskInputSchema = z.object({
  endpoint: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  fixture_path: z.string()
    .max(500)
    .refine(
      (p) => !p.includes("..") && !p.startsWith("/"),
      "fixture_path must be relative and cannot contain .."
    )
    .nullable()
    .optional(),
});

export type TaskInputData = z.infer<typeof taskInputSchema>;

// Main task schemas
export const createTaskSchema = z.object({
  task_id: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9_.-]+$/,
      "Use lowercase letters, numbers, dots, dashes, underscores"
    ),
  category: categoryEnum,
  component: z.string().default(""),
  layer: layerEnum,
  tier: tierEnum.default("gate"),
  tenant_profile: z.string().default("global"),
  description: z.string().optional().default(""),
  scoring_mode: scoringModeEnum.default("weighted"),
  pass_threshold: z.number().min(0).max(1).default(0.95),
  target_threshold: z.number().min(0).max(1).optional().nullable(),
  baseline_run_id: z.string().nullable().optional(),
  regression_signal: z.string().nullable().optional(),
  skill_id: z.string().nullable().optional(),
  golden_set_id: z.string().nullable().optional(),
  eval_checklist: evalChecklistSchema
    .partial()
    .optional()
    .default({} as Partial<EvalChecklist>),
  eval_owner: z.string().nullable().optional(),
  eval_cadence: z.string().nullable().optional(),
  golden_set_tags: z.array(z.string()).nullable().optional(),
  epochs: z.number().int().min(1).max(100).default(1),
  reducers: z.array(scoreReducerEnum).default(["mean"]),
  primary_reducer: scoreReducerEnum.default("mean"),
  status: taskStatusEnum.default("draft"),
}).refine(
  (data) => data.reducers.includes(data.primary_reducer),
  { message: "primary_reducer must be in reducers list", path: ["primary_reducer"] }
);

export const updateTaskSchema = z.object({
  category: categoryEnum.optional(),
  component: z.string().optional(),
  layer: layerEnum.optional(),
  tier: tierEnum.optional(),
  tenant_profile: z.string().optional(),
  description: z.string().optional(),
  scoring_mode: scoringModeEnum.optional(),
  pass_threshold: z.number().min(0).max(1).optional(),
  target_threshold: z.number().min(0).max(1).optional().nullable(),
  baseline_run_id: z.string().nullable().optional(),
  regression_signal: z.string().nullable().optional(),
  skill_id: z.string().nullable().optional(),
  golden_set_id: z.string().nullable().optional(),
  eval_checklist: evalChecklistSchema.partial().optional(),
  eval_owner: z.string().nullable().optional(),
  eval_cadence: z.string().nullable().optional(),
  golden_set_tags: z.array(z.string()).nullable().optional(),
  epochs: z.number().int().min(1).max(100).optional(),
  reducers: z.array(scoreReducerEnum).optional(),
  primary_reducer: scoreReducerEnum.optional(),
  status: taskStatusEnum.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  doc_type: text("doc_type").notNull(),
  version: text("version").notNull().default("1.0.0"),
  description: text("description").default(""),
  priority: text("priority").notNull(), // P0|P1|P2|P3
  status: text("status").notNull().default("active"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const skill_fields = sqliteTable("skill_fields", {
  id: text("id").primaryKey(),
  skill_id: text("skill_id")
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  field_name: text("field_name").notNull(),
  field_type: text("field_type").notNull(), // string|number|boolean|date|list|nested
  criticality: text("criticality").notNull(), // CRITICAL|IMPORTANT|INFORMATIVE
  weight: real("weight").notNull(),
  required: integer("required").notNull().default(1),
  validation_pattern: text("validation_pattern"),
  description: text("description").default(""),
  sort_order: integer("sort_order").notNull().default(0),
});

export const golden_sets = sqliteTable("golden_sets", {
  id: text("id").primaryKey(),
  skill_id: text("skill_id")
    .notNull()
    .references(() => skills.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("draft"),
  created_by: text("created_by").notNull().default("system"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
  version: integer("version").notNull().default(1),
});

export const golden_set_cases = sqliteTable(
  "golden_set_cases",
  {
    id: text("id").primaryKey(),
    golden_set_id: text("golden_set_id")
      .notNull()
      .references(() => golden_sets.id, { onDelete: "cascade" }),
    case_number: integer("case_number").notNull(),
    document_hash: text("document_hash").default("sha256:PENDING_COMPUTE"),
    document_path: text("document_path"),
    input_data: text("input_data").default("{}"),
    expected_output: text("expected_output").notNull().default("{}"),
    field_annotations: text("field_annotations").default("{}"),
    tags: text("tags").default("[]"),
    status: text("status").notNull().default("draft"),
    annotator: text("annotator").default(""),
    reviewer: text("reviewer"),
    notes: text("notes").default(""),
    document_source: text("document_source").default(""),
    citation: text("citation").default("{}"),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("idx_golden_set_cases_golden_set_id").on(table.golden_set_id),
  ],
);

export const golden_set_versions = sqliteTable("golden_set_versions", {
  id: text("id").primaryKey(),
  case_id: text("case_id")
    .notNull()
    .references(() => golden_set_cases.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  expected_output: text("expected_output").notNull(),
  changed_by: text("changed_by").notNull(),
  changed_at: integer("changed_at").notNull(),
  change_reason: text("change_reason").default(""),
});

// --- Sprint 2: Tasks ---

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  task_id: text("task_id").notNull().unique(),
  category: text("category").notNull(),
  component: text("component").notNull().default(""),
  layer: text("layer").notNull(),
  tier: text("tier").notNull().default("gate"),
  tenant_profile: text("tenant_profile").notNull().default("global"),
  description: text("description").default(""),
  scoring_mode: text("scoring_mode").notNull().default("weighted"),
  pass_threshold: real("pass_threshold").notNull().default(0.95),
  target_threshold: real("target_threshold"),
  baseline_run_id: text("baseline_run_id"),
  regression_signal: text("regression_signal"),
  skill_id: text("skill_id").references(() => skills.id, { onDelete: "set null" }),
  golden_set_id: text("golden_set_id").references(() => golden_sets.id, { onDelete: "set null" }),
  eval_checklist: text("eval_checklist").default("{}"),
  eval_owner: text("eval_owner"),
  eval_cadence: text("eval_cadence"),
  golden_set_tags: text("golden_set_tags"),
  epochs: integer("epochs").notNull().default(1),
  reducers: text("reducers").notNull().default('["mean"]'),
  primary_reducer: text("primary_reducer").notNull().default("mean"),
  status: text("status").notNull().default("draft"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const task_graders = sqliteTable("task_graders", {
  id: text("id").primaryKey(),
  task_id: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  grader_type: text("grader_type").notNull(),
  field: text("field"),
  weight: real("weight").notNull().default(1.0),
  required: integer("required").notNull().default(0),
  config: text("config").default("{}"),
  model_role: text("model_role"),
  sort_order: integer("sort_order").notNull().default(0),
});

export const task_inputs = sqliteTable("task_inputs", {
  id: text("id").primaryKey(),
  task_id: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  endpoint: text("endpoint"),
  payload: text("payload").default("{}"),
  fixture_path: text("fixture_path"),
});

// --- Sprint 2: Rubrics ---

export const rubrics = sqliteTable("rubrics", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  skill_id: text("skill_id").references(() => skills.id, { onDelete: "set null" }),
  category: text("category").notNull().default("general"),
  rubric_text: text("rubric_text").notNull().default(""),
  min_score: real("min_score").notNull().default(3.0),
  model: text("model").notNull().default("claude-sonnet-4-5-20250514"),
  status: text("status").notNull().default("draft"),
  promotion_status: text("promotion_status").notNull().default("informative"),
  version: integer("version").notNull().default(1),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const rubric_criteria = sqliteTable("rubric_criteria", {
  id: text("id").primaryKey(),
  rubric_id: text("rubric_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "cascade" }),
  criterion: text("criterion").notNull(),
  weight: real("weight").notNull().default(1.0),
  score_anchor_low: text("score_anchor_low").default(""),
  score_anchor_high: text("score_anchor_high").default(""),
  sort_order: integer("sort_order").notNull().default(0),
});

export const rubric_examples = sqliteTable("rubric_examples", {
  id: text("id").primaryKey(),
  rubric_id: text("rubric_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "cascade" }),
  input_data: text("input_data").notNull().default("{}"),
  output_data: text("output_data").notNull().default("{}"),
  expected_score: integer("expected_score").notNull(),
  reasoning: text("reasoning").default(""),
  sort_order: integer("sort_order").notNull().default(0),
});

export const rubric_versions = sqliteTable("rubric_versions", {
  id: text("id").primaryKey(),
  rubric_id: text("rubric_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  rubric_text: text("rubric_text").notNull(),
  changed_by: text("changed_by").notNull(),
  changed_at: integer("changed_at").notNull(),
  change_reason: text("change_reason").default(""),
});

// --- Sprint 3: Eval Runs ---

export const eval_runs = sqliteTable(
  "eval_runs",
  {
    id: text("id").primaryKey(),
    run_id: text("run_id").notNull().unique(),
    layer: text("layer").notNull(),
    tier: text("tier"),
    tasks_total: integer("tasks_total").notNull().default(0),
    tasks_passed: integer("tasks_passed").notNull().default(0),
    tasks_failed: integer("tasks_failed").notNull().default(0),
    overall_score: real("overall_score").notNull().default(0),
    gate_result: text("gate_result"),
    baseline_run_id: text("baseline_run_id"),
    started_at: integer("started_at").notNull(),
    finished_at: integer("finished_at"),
    metadata: text("metadata").default("{}"),
    source: text("source").notNull().default("manual"),
    imported_at: integer("imported_at").notNull(),
  },
  (table) => [
    index("idx_eval_runs_imported_at").on(table.imported_at),
  ],
);

export const eval_task_results = sqliteTable(
  "eval_task_results",
  {
    id: text("id").primaryKey(),
    run_id: text("run_id")
      .notNull()
      .references(() => eval_runs.id, { onDelete: "cascade" }),
    task_id: text("task_id").notNull(),
    passed: integer("passed").notNull(),
    score: real("score").notNull().default(0),
    severity: text("severity"),
    duration_ms: real("duration_ms").default(0),
    error: text("error"),
    regression_status: text("regression_status"),
    grader_results: text("grader_results").default("[]"),
    reducer_scores: text("reducer_scores").default("{}"),
    epoch_scores: text("epoch_scores").default("[]"),
  },
  (table) => [
    index("idx_eval_task_results_run_id").on(table.run_id),
    index("idx_eval_task_results_task_id").on(table.task_id),
  ],
);

export const eval_postmortems = sqliteTable("eval_postmortems", {
  id: text("id").primaryKey(),
  run_id: text("run_id")
    .notNull()
    .references(() => eval_runs.id, { onDelete: "cascade" }),
  task_id: text("task_id"),
  what: text("what").notNull(),
  root_cause: text("root_cause").notNull(),
  impact: text("impact").notNull(),
  fix: text("fix").notNull(),
  prevention: text("prevention").notNull(),
  created_by: text("created_by").notNull(),
  created_at: integer("created_at").notNull(),
});

// --- Sprint 3: Contracts ---

export const contracts = sqliteTable("contracts", {
  id: text("id").primaryKey(),
  service_name: text("service_name").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull().default("GET"),
  schema_snapshot: text("schema_snapshot").notNull().default("{}"),
  version: integer("version").notNull().default(1),
  source_commit: text("source_commit").default(""),
  status: text("status").notNull().default("active"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const contract_versions = sqliteTable("contract_versions", {
  id: text("id").primaryKey(),
  contract_id: text("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  schema_snapshot: text("schema_snapshot").notNull(),
  diff_from_previous: text("diff_from_previous"),
  imported_at: integer("imported_at").notNull(),
  imported_by: text("imported_by").notNull().default("system"),
});

// --- Sprint 3: Convention Rules ---

export const convention_rules = sqliteTable("convention_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("medium"),
  description: text("description").default(""),
  detection_pattern: text("detection_pattern").default(""),
  detection_type: text("detection_type").notNull().default("regex"),
  positive_example: text("positive_example").default(""),
  negative_example: text("negative_example").default(""),
  source: text("source").default(""),
  status: text("status").notNull().default("active"),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

// --- Sprint 4: Calibration ---

export const calibration_sessions = sqliteTable("calibration_sessions", {
  id: text("id").primaryKey(),
  skill_id: text("skill_id")
    .notNull()
    .references(() => skills.id, { onDelete: "restrict" }),
  golden_set_id: text("golden_set_id")
    .notNull()
    .references(() => golden_sets.id, { onDelete: "restrict" }),
  annotator_1: text("annotator_1").notNull(),
  annotator_2: text("annotator_2").notNull(),
  status: text("status").notNull().default("in_progress"),
  cohens_kappa: real("cohens_kappa"),
  started_at: integer("started_at").notNull(),
  completed_at: integer("completed_at"),
});

export const calibration_annotations = sqliteTable(
  "calibration_annotations",
  {
    id: text("id").primaryKey(),
    session_id: text("session_id")
      .notNull()
      .references(() => calibration_sessions.id, { onDelete: "cascade" }),
    case_id: text("case_id")
      .notNull()
      .references(() => golden_set_cases.id, { onDelete: "cascade" }),
    annotator: text("annotator").notNull(),
    annotations: text("annotations").notNull().default("{}"),
    created_at: integer("created_at").notNull(),
    is_blind: integer("is_blind").notNull().default(1),
  },
  (table) => [
    index("idx_calibration_annotations_session_id").on(table.session_id),
  ],
);

export const calibration_disagreements = sqliteTable("calibration_disagreements", {
  id: text("id").primaryKey(),
  session_id: text("session_id")
    .notNull()
    .references(() => calibration_sessions.id, { onDelete: "cascade" }),
  case_id: text("case_id")
    .notNull()
    .references(() => golden_set_cases.id, { onDelete: "cascade" }),
  field_name: text("field_name").notNull(),
  annotator_1_value: text("annotator_1_value").notNull(),
  annotator_2_value: text("annotator_2_value").notNull(),
  resolution: text("resolution"),
  resolved_by: text("resolved_by"),
  resolved_at: integer("resolved_at"),
});

// --- Sprint 4 Phase 3: A/B Testing + Concordance ---

export const rubric_ab_tests = sqliteTable("rubric_ab_tests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rubric_a_id: text("rubric_a_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "restrict" }),
  rubric_b_id: text("rubric_b_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "restrict" }),
  golden_set_id: text("golden_set_id")
    .notNull()
    .references(() => golden_sets.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("pending"), // pending|running|completed
  results_a: text("results_a").default("[]"), // JSON array of scores
  results_b: text("results_b").default("[]"), // JSON array of scores
  winner: text("winner"), // "a"|"b"|"tie"|null
  created_at: integer("created_at").notNull(),
  completed_at: integer("completed_at"),
});

export const rubric_concordance_tests = sqliteTable("rubric_concordance_tests", {
  id: text("id").primaryKey(),
  rubric_id: text("rubric_id")
    .notNull()
    .references(() => rubrics.id, { onDelete: "cascade" }),
  case_id: text("case_id").notNull(),
  scores: text("scores").notNull().default("[]"), // JSON array of numbers e.g. [4,4,3]
  concordance_score: real("concordance_score").notNull(), // 1.0 if all same
  created_at: integer("created_at").notNull(),
});

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_graders, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { toJson } from "@/lib/db";
import { z } from "zod";
import { categoryEnum, layerEnum, tierEnum, scoringModeEnum, scoreReducerEnum, taskStatusEnum } from "@/lib/validations/task";

const importGraderSchema = z.object({
  type: z.string(),
  field: z.string().nullable().optional(),
  weight: z.number().default(1.0),
  required: z.boolean().optional().default(false),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  model_role: z.string().nullable().optional(),
});

const importInputSchema = z.object({
  endpoint: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  fixture_path: z.string().max(500).refine(
    (p) => !p.includes("..") && !p.startsWith("/"),
    "fixture_path must be relative and cannot contain .."
  ).nullable().optional(),
});

const importTaskSchema = z.object({
  task_id: z.string().min(1),
  category: categoryEnum,
  component: z.string().optional().default(""),
  layer: layerEnum,
  tier: tierEnum.optional().default("gate"),
  tenant_profile: z.string().optional().default("global"),
  description: z.string().optional().default(""),
  scoring_mode: scoringModeEnum.optional().default("weighted"),
  pass_threshold: z.number().min(0).max(1).optional().default(0.95),
  target_threshold: z.number().nullable().optional(),
  baseline_run_id: z.string().nullable().optional(),
  regression_signal: z.string().nullable().optional(),
  input: importInputSchema.optional(),
  graders: z.array(importGraderSchema).optional().default([]),
  eval_checklist: z.record(z.string(), z.unknown()).optional().default({}),
  eval_owner: z.string().nullable().optional(),
  eval_cadence: z.string().nullable().optional(),
  epochs: z.number().int().min(1).optional().default(1),
  reducers: z.array(scoreReducerEnum).optional().default(["mean"]),
  primary_reducer: scoreReducerEnum.optional().default("mean"),
  status: taskStatusEnum.optional().default("draft"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const upsert = searchParams.get("upsert") === "true";

    const items = Array.isArray(body) ? body : [body];
    if (items.length > 1000) {
      return NextResponse.json(
        { error: "Maximum 1000 tasks per import" },
        { status: 400 }
      );
    }
    const results: Array<{ task_id: string; id: string; status: string }> = [];
    const errors: Array<{ task_id: string; error: string }> = [];

    for (const item of items) {
      const parsed = importTaskSchema.safeParse(item);
      if (!parsed.success) {
        errors.push({
          task_id: item.task_id ?? "unknown",
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
        continue;
      }

      const d = parsed.data;
      const now = Date.now();

      const existing = db
        .select()
        .from(tasks)
        .where(eq(tasks.task_id, d.task_id))
        .get();

      if (existing && !upsert) {
        errors.push({ task_id: d.task_id, error: "task_id already exists" });
        continue;
      }

      if (existing && upsert) {
        const id = existing.id;
        // SQLite serializes writers (WAL mode), so concurrent upserts are safe.
        // If migrating to PostgreSQL, replace with ON CONFLICT DO UPDATE.
        db.transaction((tx) => {
          tx.update(tasks)
            .set({
              category: d.category,
              component: d.component ?? "",
              layer: d.layer,
              tier: d.tier,
              tenant_profile: d.tenant_profile ?? "global",
              description: d.description ?? "",
              scoring_mode: d.scoring_mode,
              pass_threshold: d.pass_threshold,
              target_threshold: d.target_threshold ?? null,
              baseline_run_id: d.baseline_run_id ?? null,
              regression_signal: d.regression_signal ?? null,
              eval_checklist: toJson(d.eval_checklist ?? {}),
              eval_owner: d.eval_owner ?? null,
              eval_cadence: d.eval_cadence ?? null,
              epochs: d.epochs ?? 1,
              reducers: toJson(d.reducers ?? ["mean"]),
              primary_reducer: d.primary_reducer ?? "mean",
              status: d.status ?? existing.status,
              updated_at: now,
            })
            .where(eq(tasks.id, id))
            .run();

          tx.delete(task_graders).where(eq(task_graders.task_id, id)).run();
          tx.delete(task_inputs).where(eq(task_inputs.task_id, id)).run();

          if (d.input) {
            tx.insert(task_inputs)
              .values({
                id: uuidv4(),
                task_id: id,
                endpoint: d.input.endpoint ?? null,
                payload: toJson(d.input.payload ?? {}),
                fixture_path: d.input.fixture_path ?? null,
              })
              .run();
          }

          d.graders.forEach((g, idx) => {
            tx.insert(task_graders)
              .values({
                id: uuidv4(),
                task_id: id,
                grader_type: g.type,
                field: g.field ?? null,
                weight: g.weight ?? 1.0,
                required: g.required ? 1 : 0,
                config: toJson(g.config ?? {}),
                model_role: g.model_role ?? null,
                sort_order: idx,
              })
              .run();
          });
        });

        results.push({ task_id: d.task_id, id, status: "updated" });
        continue;
      }

      const id = uuidv4();

      db.transaction((tx) => {
        tx.insert(tasks)
          .values({
            id,
            task_id: d.task_id,
            category: d.category,
            component: d.component ?? "",
            layer: d.layer,
            tier: d.tier,
            tenant_profile: d.tenant_profile ?? "global",
            description: d.description ?? "",
            scoring_mode: d.scoring_mode,
            pass_threshold: d.pass_threshold,
            target_threshold: d.target_threshold ?? null,
            baseline_run_id: d.baseline_run_id ?? null,
            regression_signal: d.regression_signal ?? null,
            skill_id: null,
            golden_set_id: null,
            eval_checklist: toJson(d.eval_checklist ?? {}),
            eval_owner: d.eval_owner ?? null,
            eval_cadence: d.eval_cadence ?? null,
            epochs: d.epochs ?? 1,
            reducers: toJson(d.reducers ?? ["mean"]),
            primary_reducer: d.primary_reducer ?? "mean",
            status: d.status ?? "draft",
            created_at: now,
            updated_at: now,
          })
          .run();

        if (d.input) {
          tx.insert(task_inputs)
            .values({
              id: uuidv4(),
              task_id: id,
              endpoint: d.input.endpoint ?? null,
              payload: toJson(d.input.payload ?? {}),
              fixture_path: d.input.fixture_path ?? null,
            })
            .run();
        }

        d.graders.forEach((g, idx) => {
          tx.insert(task_graders)
            .values({
              id: uuidv4(),
              task_id: id,
              grader_type: g.type,
              field: g.field ?? null,
              weight: g.weight ?? 1.0,
              required: g.required ? 1 : 0,
              config: toJson(g.config ?? {}),
              model_role: g.model_role ?? null,
              sort_order: idx,
            })
            .run();
        });
      });

      results.push({ task_id: d.task_id, id, status: "imported" });
    }

    return NextResponse.json(
      { imported: results.length, error_count: errors.length, results, errors },
      { status: errors.length > 0 && results.length === 0 ? 422 : 201 }
    );
  } catch (err) {
    console.error("POST /api/tasks/import error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

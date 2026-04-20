import { db } from "@/db";
import { eval_runs, eval_task_results } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  importRunSchema,
  deriveRegressionStatus,
  deriveSeverity,
} from "@/lib/validations/run";
import { toJson } from "@/lib/db";

/**
 * Validates, inserts, and returns an eval_run record from raw data.
 *
 * @param data - Raw (unknown) payload from caller
 * @param source - "ci" for webhook, "import" for manual POST
 * @throws Error with prefix "DUPLICATE:" when run_id already exists
 * @throws Error with prefix "VALIDATION:" when zod parse fails
 */
export async function importRunIntoDb(
  data: unknown,
  source: string
): Promise<{ id: string; run_id: string }> {
  const parsed = importRunSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`VALIDATION:${JSON.stringify(parsed.error.issues)}`);
  }

  const d = parsed.data;

  const existing = db
    .select()
    .from(eval_runs)
    .where(eq(eval_runs.run_id, d.run_id))
    .get();

  if (existing) {
    throw new Error(`DUPLICATE:Run '${d.run_id}' already exists`);
  }

  const now = Date.now();
  const runDbId = uuidv4();

  const startedAt = new Date(d.started_at).getTime();
  const finishedAt = d.finished_at ? new Date(d.finished_at).getTime() : null;

  db.transaction((tx) => {
    tx.insert(eval_runs)
      .values({
        id: runDbId,
        run_id: d.run_id,
        layer: d.layer,
        tier: d.tier ?? null,
        tasks_total: d.tasks_total,
        tasks_passed: d.tasks_passed,
        tasks_failed: d.tasks_failed,
        overall_score: d.overall_score,
        gate_result: d.gate_result ?? null,
        baseline_run_id: d.baseline_run_id ?? null,
        started_at: startedAt,
        finished_at: finishedAt,
        metadata: toJson(d.metadata ?? {}),
        source,
        imported_at: now,
      })
      .run();

    for (const tr of d.task_results) {
      const regressionStatus = deriveRegressionStatus(
        tr.task_id,
        d.newly_failing,
        d.newly_passing,
        d.stable_pass,
        d.stable_fail
      );

      const severity = deriveSeverity(tr.score, tr.passed);

      tx.insert(eval_task_results)
        .values({
          id: uuidv4(),
          run_id: runDbId,
          task_id: tr.task_id,
          passed: tr.passed ? 1 : 0,
          score: tr.score,
          severity,
          duration_ms: tr.duration_ms ?? 0,
          error: tr.error ?? null,
          regression_status: regressionStatus,
          grader_results: toJson(tr.grader_results),
          reducer_scores: toJson(tr.reducer_scores ?? {}),
          epoch_scores: toJson(tr.epoch_scores ?? []),
        })
        .run();
    }
  });

  return { id: runDbId, run_id: d.run_id };
}

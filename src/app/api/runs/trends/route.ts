import { NextResponse } from "next/server";
import { db } from "@/db";
import { eval_runs, eval_task_results } from "@/db/schema";
import { and, asc, eq, SQL } from "drizzle-orm";
import { detectConsecutiveDeclines } from "@/lib/trends";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const task_id = searchParams.get("task_id");
    const layer = searchParams.get("layer");
    const nDeclines = parseInt(searchParams.get("n") ?? "3", 10);

    if (task_id) {
      // Single JOIN query — no N+1
      const rows = db
        .select({
          run_id: eval_runs.run_id,
          run_db_id: eval_runs.id,
          started_at: eval_runs.started_at,
          score: eval_task_results.score,
          passed: eval_task_results.passed,
          regression_status: eval_task_results.regression_status,
        })
        .from(eval_task_results)
        .innerJoin(eval_runs, eq(eval_task_results.run_id, eval_runs.id))
        .where(eq(eval_task_results.task_id, task_id))
        .orderBy(asc(eval_runs.started_at))
        .all();

      const points = rows.map((r) => ({
        run_id: r.run_id,
        run_db_id: r.run_db_id,
        started_at: r.started_at,
        score: r.score,
        passed: r.passed === 1,
        regression_status: r.regression_status,
      }));

      const { maxConsecutive: maxConsecutiveDeclines } = detectConsecutiveDeclines(points.map((p) => p.score));
      const degradationAlert = maxConsecutiveDeclines >= nDeclines;

      return NextResponse.json({
        task_id,
        points,
        degradation_alert: degradationAlert,
        max_consecutive_declines: maxConsecutiveDeclines,
        n_threshold: nDeclines,
      });
    } else {
      // Overall score trend per run
      const conditions: SQL[] = [];
      if (layer) conditions.push(eq(eval_runs.layer, layer));

      const runs = db
        .select()
        .from(eval_runs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(eval_runs.started_at))
        .all();

      const points = runs.map((run) => ({
        run_id: run.run_id,
        run_db_id: run.id,
        started_at: run.started_at,
        layer: run.layer,
        tier: run.tier,
        overall_score: run.overall_score,
        gate_result: run.gate_result,
        tasks_passed: run.tasks_passed,
        tasks_failed: run.tasks_failed,
        tasks_total: run.tasks_total,
      }));

      const { maxConsecutive: maxConsecutiveDeclines } = detectConsecutiveDeclines(points.map((p) => p.overall_score));
      const degradationAlert = maxConsecutiveDeclines >= nDeclines;

      return NextResponse.json({
        layer: layer ?? "all",
        points,
        degradation_alert: degradationAlert,
        max_consecutive_declines: maxConsecutiveDeclines,
        n_threshold: nDeclines,
      });
    }
  } catch (err) {
    console.error("GET /api/runs/trends error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

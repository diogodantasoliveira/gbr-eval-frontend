import { NextResponse } from "next/server";
import { db } from "@/db";
import { eval_runs, eval_task_results, tasks } from "@/db/schema";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { deriveSeverity } from "@/lib/validations/run";
import { detectConsecutiveDeclines } from "@/lib/trends";

export interface Alert {
  id: string;
  type: "score_drop" | "regression" | "trend_decline";
  severity: "critical" | "high" | "medium";
  description: string;
  run_id: string;
  task_id?: string;
  timestamp: number;
}

const TREND_WINDOW = 3;
const RECENT_RUNS_LIMIT = 20;
const RECENT_DAYS = 30;

export async function GET() {
  try {
    const alerts: Alert[] = [];

    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;

    const recentRuns = db
      .select()
      .from(eval_runs)
      .where(gte(eval_runs.imported_at, cutoff))
      .orderBy(desc(eval_runs.imported_at))
      .limit(RECENT_RUNS_LIMIT)
      .all();

    const taskRows = db.select().from(tasks).all();
    const taskMap = new Map(taskRows.map((t) => [t.task_id, t]));

    let alertIdx = 0;

    const runIds = recentRuns.map((r) => r.id);
    const runMap = new Map(recentRuns.map((r) => [r.id, r]));

    const allFailedResults = runIds.length > 0
      ? db
          .select()
          .from(eval_task_results)
          .where(and(inArray(eval_task_results.run_id, runIds), eq(eval_task_results.passed, 0)))
          .all()
      : [];

    for (const tr of allFailedResults) {
      const run = runMap.get(tr.run_id);
      if (!run) continue;

      const task = taskMap.get(tr.task_id);
      const threshold = task?.pass_threshold ?? 0.95;

      if (tr.score < threshold) {
        const severity = deriveSeverity(tr.score, false);
        if (severity !== "low") {
          alerts.push({
            id: `score_drop_${run.id}_${tr.task_id}_${alertIdx++}`,
            type: "score_drop",
            severity: severity as Alert["severity"],
            description: `Task "${tr.task_id}" scored ${(tr.score * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%) in run ${run.run_id}`,
            run_id: run.id,
            task_id: tr.task_id,
            timestamp: run.imported_at,
          });
        }
      }

      if (tr.regression_status === "new_failure") {
        alerts.push({
          id: `regression_${run.id}_${tr.task_id}_${alertIdx++}`,
          type: "regression",
          severity: "high",
          description: `Task "${tr.task_id}" regressed (was passing, now failing) in run ${run.run_id}`,
          run_id: run.id,
          task_id: tr.task_id,
          timestamp: run.imported_at,
        });
      }
    }

    // Trend decline: single JOIN query ordered by imported_at asc, limited to recent window
    const trendRows = db
      .select({
        task_id: eval_task_results.task_id,
        score: eval_task_results.score,
        run_id: eval_task_results.run_id,
        imported_at: eval_runs.imported_at,
      })
      .from(eval_task_results)
      .innerJoin(eval_runs, eq(eval_task_results.run_id, eval_runs.id))
      .where(gte(eval_runs.imported_at, cutoff))
      .orderBy(asc(eval_runs.imported_at))
      .all();

    const scoresByTask = new Map<string, { score: number; run_id: string; imported_at: number }[]>();
    for (const r of trendRows) {
      const arr = scoresByTask.get(r.task_id) ?? [];
      arr.push({ score: r.score, run_id: r.run_id, imported_at: r.imported_at });
      scoresByTask.set(r.task_id, arr);
    }

    for (const [taskId, history] of scoresByTask.entries()) {
      if (history.length < TREND_WINDOW) continue;

      const scores = history.map((h) => h.score);
      const { maxConsecutive } = detectConsecutiveDeclines(scores);

      if (maxConsecutive >= TREND_WINDOW) {
        const latest = history[history.length - 1];
        const alreadyReported = alerts.some(
          (a) => a.run_id === latest.run_id && a.task_id === taskId && a.type === "score_drop"
        );
        if (!alreadyReported) {
          alerts.push({
            id: `trend_${taskId}_${alertIdx++}`,
            type: "trend_decline",
            severity: "medium",
            description: `Task "${taskId}" has declined for ${TREND_WINDOW} consecutive runs (latest: ${(latest.score * 100).toFixed(1)}%)`,
            run_id: latest.run_id,
            task_id: taskId,
            timestamp: latest.imported_at,
          });
        }
      }
    }

    alerts.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(alerts);
  } catch (err) {
    console.error("GET /api/alerts error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

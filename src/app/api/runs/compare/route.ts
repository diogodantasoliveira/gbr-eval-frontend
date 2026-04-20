import { NextResponse } from "next/server";
import { db } from "@/db";
import { eval_runs, eval_task_results } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { redactString } from "@/lib/pii/redactor";
import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const compareSchema = z.object({
  run_id_a: z.string().regex(UUID_RE, "Must be a valid UUID"),
  run_id_b: z.string().regex(UUID_RE, "Must be a valid UUID"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = compareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { run_id_a, run_id_b } = parsed.data;

    const runA = db.select().from(eval_runs).where(eq(eval_runs.id, run_id_a)).get();
    const runB = db.select().from(eval_runs).where(eq(eval_runs.id, run_id_b)).get();

    if (!runA) {
      return NextResponse.json({ error: "Run A not found" }, { status: 404 });
    }
    if (!runB) {
      return NextResponse.json({ error: "Run B not found" }, { status: 404 });
    }

    const resultsA = db
      .select()
      .from(eval_task_results)
      .where(eq(eval_task_results.run_id, run_id_a))
      .all();

    const resultsB = db
      .select()
      .from(eval_task_results)
      .where(eq(eval_task_results.run_id, run_id_b))
      .all();

    const redactGraderResults = (raw: string) => {
      const parsed = safeJsonParse<Array<Record<string, unknown>>>(raw, []);
      return parsed.map((gr) => ({
        ...gr,
        details: typeof gr.details === "string" ? redactString(gr.details).value : gr.details,
      }));
    };

    const mapA = new Map(resultsA.map((r) => [r.task_id, r]));
    const mapB = new Map(resultsB.map((r) => [r.task_id, r]));

    const allTaskIds = new Set([...mapA.keys(), ...mapB.keys()]);

    const taskComparisons = Array.from(allTaskIds).map((taskId) => {
      const a = mapA.get(taskId);
      const b = mapB.get(taskId);

      const scoreDelta =
        a && b ? b.score - a.score : null;

      const statusChanged =
        a && b ? a.passed !== b.passed : null;

      let change: "improved" | "regressed" | "unchanged" | "added" | "removed";
      if (!a) change = "added";
      else if (!b) change = "removed";
      else if (scoreDelta !== null && scoreDelta > 0.01) change = "improved";
      else if (scoreDelta !== null && scoreDelta < -0.01) change = "regressed";
      else change = "unchanged";

      return {
        task_id: taskId,
        a: a
          ? {
              passed: a.passed === 1,
              score: a.score,
              severity: a.severity,
              regression_status: a.regression_status,
              duration_ms: a.duration_ms,
              grader_results: redactGraderResults(a.grader_results ?? "[]"),
            }
          : null,
        b: b
          ? {
              passed: b.passed === 1,
              score: b.score,
              severity: b.severity,
              regression_status: b.regression_status,
              duration_ms: b.duration_ms,
              grader_results: redactGraderResults(b.grader_results ?? "[]"),
            }
          : null,
        score_delta: scoreDelta,
        status_changed: statusChanged,
        change,
      };
    });

    const improved = taskComparisons.filter((t) => t.change === "improved").length;
    const regressed = taskComparisons.filter((t) => t.change === "regressed").length;
    const unchanged = taskComparisons.filter((t) => t.change === "unchanged").length;
    const added = taskComparisons.filter((t) => t.change === "added").length;
    const removed = taskComparisons.filter((t) => t.change === "removed").length;

    return NextResponse.json({
      run_a: runA,
      run_b: runB,
      summary: { improved, regressed, unchanged, added, removed },
      tasks: taskComparisons,
    });
  } catch (err) {
    console.error("POST /api/runs/compare error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

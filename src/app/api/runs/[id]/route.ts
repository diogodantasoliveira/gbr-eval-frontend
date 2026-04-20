import { NextResponse } from "next/server";
import { db } from "@/db";
import { eval_runs, eval_task_results } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { redactString } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const run = db.select().from(eval_runs).where(eq(eval_runs.id, id)).get();
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const taskResults = db
      .select()
      .from(eval_task_results)
      .where(eq(eval_task_results.run_id, id))
      .all();

    const taskResultsWithParsed = taskResults.map((tr) => {
      const graderResults = safeJsonParse<Array<Record<string, unknown>>>(tr.grader_results ?? "[]", []);
      const redactedResults = graderResults.map((gr) => ({
        ...gr,
        details: typeof gr.details === "string" ? redactString(gr.details).value : gr.details,
      }));
      return {
        ...tr,
        passed: tr.passed === 1,
        error: tr.error ? redactString(tr.error).value : tr.error,
        grader_results: redactedResults,
      };
    });

    return NextResponse.json({
      ...run,
      task_results: taskResultsWithParsed,
    });
  } catch (err) {
    console.error("GET /api/runs/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const run = db.select().from(eval_runs).where(eq(eval_runs.id, id)).get();
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    db.delete(eval_runs).where(eq(eval_runs.id, id)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/runs/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_graders, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
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

    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const graders = db
      .select()
      .from(task_graders)
      .where(eq(task_graders.task_id, id))
      .orderBy(task_graders.sort_order)
      .all();

    const input = db
      .select()
      .from(task_inputs)
      .where(eq(task_inputs.task_id, id))
      .get();

    // Build CLI YAML-compatible JSON
    const exported: Record<string, unknown> = {
      task_id: task.task_id,
      category: task.category,
      component: task.component || undefined,
      layer: task.layer,
      tier: task.tier,
      tenant_profile: task.tenant_profile !== "global" ? task.tenant_profile : undefined,
      description: task.description || undefined,
      scoring_mode: task.scoring_mode !== "weighted" ? task.scoring_mode : undefined,
      pass_threshold: task.pass_threshold,
      target_threshold: task.target_threshold ?? undefined,
      baseline_run_id: task.baseline_run_id ?? undefined,
      regression_signal: task.regression_signal ?? undefined,
    };

    if (input) {
      exported.input = {
        endpoint: input.endpoint ?? undefined,
        payload: redactRecord(safeJsonParse<Record<string, unknown>>(input.payload ?? "{}", {})),
        fixture_path: input.fixture_path ?? undefined,
      };
    }

    exported.graders = graders.map((g) => {
      const graderEntry: Record<string, unknown> = {
        type: g.grader_type,
        field: g.field ?? undefined,
        weight: g.weight,
        required: g.required === 1 ? true : undefined,
      };
      const config = safeJsonParse(g.config ?? "{}", {} as Record<string, unknown>);
      if (Object.keys(config).length > 0) {
        Object.assign(graderEntry, config);
      }
      return graderEntry;
    });

    const evalChecklist = safeJsonParse(task.eval_checklist ?? "{}", {});
    if (Object.keys(evalChecklist).length > 0) {
      exported.eval_checklist = evalChecklist;
    }

    return new NextResponse(JSON.stringify(exported, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${task.task_id.replace(/[^a-zA-Z0-9._-]/g, "_")}.json"`,
      },
    });
  } catch (err) {
    console.error("GET /api/tasks/[id]/export error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

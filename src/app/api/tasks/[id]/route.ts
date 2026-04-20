import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_graders, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateTaskSchema } from "@/lib/validations/task";
import { toJson, safeJsonParse } from "@/lib/db";
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

    return NextResponse.json({
      ...task,
      eval_checklist: safeJsonParse(task.eval_checklist ?? "{}", {}),
      graders: graders.map((g) => ({
        ...g,
        config: safeJsonParse(g.config ?? "{}", {}),
        required: g.required === 1,
      })),
      input: input
        ? {
            ...input,
            payload: redactRecord(safeJsonParse(input.payload ?? "{}", {})),
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/tasks/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: Date.now() };
    const d = parsed.data;
    if (d.category !== undefined) updates.category = d.category;
    if (d.component !== undefined) updates.component = d.component;
    if (d.layer !== undefined) updates.layer = d.layer;
    if (d.tier !== undefined) updates.tier = d.tier;
    if (d.tenant_profile !== undefined) updates.tenant_profile = d.tenant_profile;
    if (d.description !== undefined) updates.description = d.description;
    if (d.scoring_mode !== undefined) updates.scoring_mode = d.scoring_mode;
    if (d.pass_threshold !== undefined) updates.pass_threshold = d.pass_threshold;
    if (d.target_threshold !== undefined) updates.target_threshold = d.target_threshold;
    if (d.baseline_run_id !== undefined) updates.baseline_run_id = d.baseline_run_id;
    if (d.regression_signal !== undefined) updates.regression_signal = d.regression_signal;
    if (d.skill_id !== undefined) updates.skill_id = d.skill_id;
    if (d.golden_set_id !== undefined) updates.golden_set_id = d.golden_set_id;
    if (d.eval_checklist !== undefined) updates.eval_checklist = toJson(d.eval_checklist);
    if (d.eval_owner !== undefined) updates.eval_owner = d.eval_owner;
    if (d.eval_cadence !== undefined) updates.eval_cadence = d.eval_cadence;
    if (d.golden_set_tags !== undefined) updates.golden_set_tags = d.golden_set_tags ? toJson(d.golden_set_tags) : null;
    if (d.epochs !== undefined) updates.epochs = d.epochs;
    if (d.reducers !== undefined) updates.reducers = toJson(d.reducers);
    if (d.primary_reducer !== undefined) updates.primary_reducer = d.primary_reducer;
    if (d.status !== undefined) updates.status = d.status;

    db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

    const updated = db.select().from(tasks).where(eq(tasks.id, id)).get();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/tasks/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    db.delete(tasks).where(eq(tasks.id, id)).run();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/tasks/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

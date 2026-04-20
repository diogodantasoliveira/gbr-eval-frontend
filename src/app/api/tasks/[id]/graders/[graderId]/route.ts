import { NextResponse } from "next/server";
import { db } from "@/db";
import { task_graders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateTaskGraderSchema } from "@/lib/validations/task";
import { toJson, safeJsonParse } from "@/lib/db";
import { isValidId } from "@/lib/validations/params";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; graderId: string }> }
) {
  try {
    const { id, graderId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(graderId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(task_graders)
      .where(and(eq(task_graders.id, graderId), eq(task_graders.task_id, id)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateTaskGraderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.grader_type !== undefined) updates.grader_type = d.grader_type;
    if (d.field !== undefined) updates.field = d.field;
    if (d.weight !== undefined) updates.weight = d.weight;
    if (d.required !== undefined) updates.required = d.required ? 1 : 0;
    if (d.config !== undefined) updates.config = toJson(d.config);
    if (d.model_role !== undefined) updates.model_role = d.model_role;
    if (d.sort_order !== undefined) updates.sort_order = d.sort_order;

    db.update(task_graders).set(updates).where(eq(task_graders.id, graderId)).run();

    const updated = db
      .select()
      .from(task_graders)
      .where(eq(task_graders.id, graderId))
      .get();

    return NextResponse.json({
      ...updated,
      config: safeJsonParse(updated?.config ?? "{}", {}),
      required: updated?.required === 1,
    });
  } catch (err) {
    console.error("PUT /api/tasks/[id]/graders/[graderId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; graderId: string }> }
) {
  try {
    const { id, graderId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(graderId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(task_graders)
      .where(and(eq(task_graders.id, graderId), eq(task_graders.task_id, id)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    db.delete(task_graders).where(eq(task_graders.id, graderId)).run();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/tasks/[id]/graders/[graderId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_graders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTaskGraderSchema } from "@/lib/validations/task";
import { toJson, safeJsonParse } from "@/lib/db";
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

    return NextResponse.json(
      graders.map((g) => ({
        ...g,
        config: safeJsonParse(g.config ?? "{}", {}),
        required: g.required === 1,
      }))
    );
  } catch (err) {
    console.error("GET /api/tasks/[id]/graders error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
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

    const body = await req.json();
    const parsed = createTaskGraderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const graderId = uuidv4();
    db.insert(task_graders)
      .values({
        id: graderId,
        task_id: id,
        grader_type: parsed.data.grader_type,
        field: parsed.data.field ?? null,
        weight: parsed.data.weight,
        required: parsed.data.required ? 1 : 0,
        config: toJson(parsed.data.config ?? {}),
        model_role: parsed.data.model_role ?? null,
        sort_order: parsed.data.sort_order,
      })
      .run();

    const created = db
      .select()
      .from(task_graders)
      .where(eq(task_graders.id, graderId))
      .get();

    return NextResponse.json(
      {
        ...created,
        config: safeJsonParse(created?.config ?? "{}", {}),
        required: created?.required === 1,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/tasks/[id]/graders error:", err instanceof Error ? err.message : "Unknown error");
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

    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    db.delete(task_graders).where(eq(task_graders.task_id, id)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/tasks/[id]/graders error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

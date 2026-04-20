import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { toJson, safeJsonParse } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";
import { taskInputSchema as inputSchema } from "@/lib/validations/task";

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
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Upsert: delete existing then insert
    const inputId = uuidv4();
    db.transaction((tx) => {
      tx.delete(task_inputs).where(eq(task_inputs.task_id, id)).run();
      tx.insert(task_inputs)
        .values({
          id: inputId,
          task_id: id,
          endpoint: parsed.data.endpoint ?? null,
          payload: toJson(parsed.data.payload ?? {}),
          fixture_path: parsed.data.fixture_path ?? null,
        })
        .run();
    });

    const created = db
      .select()
      .from(task_inputs)
      .where(eq(task_inputs.id, inputId))
      .get();

    return NextResponse.json(
      {
        ...created,
        payload: redactRecord(safeJsonParse<Record<string, unknown>>(created?.payload ?? "{}", {})),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/tasks/[id]/input error:", err instanceof Error ? err.message : "Unknown error");
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

    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const inputId = uuidv4();
    db.transaction((tx) => {
      tx.delete(task_inputs).where(eq(task_inputs.task_id, id)).run();
      tx.insert(task_inputs)
        .values({
          id: inputId,
          task_id: id,
          endpoint: parsed.data.endpoint ?? null,
          payload: toJson(parsed.data.payload ?? {}),
          fixture_path: parsed.data.fixture_path ?? null,
        })
        .run();
    });

    const updated = db
      .select()
      .from(task_inputs)
      .where(eq(task_inputs.id, inputId))
      .get();

    return NextResponse.json({
      ...updated,
      payload: redactRecord(safeJsonParse<Record<string, unknown>>(updated?.payload ?? "{}", {})),
    });
  } catch (err) {
    console.error("PUT /api/tasks/[id]/input error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

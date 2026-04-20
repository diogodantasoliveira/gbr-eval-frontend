import { NextResponse } from "next/server";
import { db } from "@/db";
import { eval_runs, eval_postmortems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createPostmortemSchema } from "@/lib/validations/run";
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

    const postmortems = db
      .select()
      .from(eval_postmortems)
      .where(eq(eval_postmortems.run_id, id))
      .all();

    const redacted = postmortems.map((pm) => ({
      ...pm,
      what: redactString(pm.what).value,
      root_cause: redactString(pm.root_cause).value,
      impact: redactString(pm.impact).value,
      fix: redactString(pm.fix).value,
      prevention: redactString(pm.prevention).value,
    }));

    return NextResponse.json(redacted);
  } catch (err) {
    console.error("GET /api/runs/[id]/postmortem error:", err instanceof Error ? err.message : "Unknown error");
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

    const run = db.select().from(eval_runs).where(eq(eval_runs.id, id)).get();
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createPostmortemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const pmId = uuidv4();

    db.insert(eval_postmortems)
      .values({
        id: pmId,
        run_id: id,
        task_id: parsed.data.task_id ?? null,
        what: parsed.data.what,
        root_cause: parsed.data.root_cause,
        impact: parsed.data.impact,
        fix: parsed.data.fix,
        prevention: parsed.data.prevention,
        created_by: parsed.data.created_by,
        created_at: now,
      })
      .run();

    const created = db
      .select()
      .from(eval_postmortems)
      .where(eq(eval_postmortems.id, pmId))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/runs/[id]/postmortem error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

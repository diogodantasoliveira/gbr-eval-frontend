import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubrics, rubric_examples } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createExampleSchema } from "@/lib/validations/rubric";
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

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const examples = db
      .select()
      .from(rubric_examples)
      .where(eq(rubric_examples.rubric_id, id))
      .orderBy(rubric_examples.sort_order)
      .all();

    const redacted = examples.map((ex) => ({
      ...ex,
      input_data: ex.input_data ? JSON.stringify(redactRecord(safeJsonParse<Record<string, unknown>>(ex.input_data, {}))) : ex.input_data,
      output_data: ex.output_data ? JSON.stringify(redactRecord(safeJsonParse<Record<string, unknown>>(ex.output_data, {}))) : ex.output_data,
    }));

    return NextResponse.json(redacted);
  } catch (err) {
    console.error("GET /api/rubrics/[id]/examples error:", err instanceof Error ? err.message : "Unknown error");
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

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createExampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const exampleId = uuidv4();

    db.insert(rubric_examples)
      .values({
        id: exampleId,
        rubric_id: id,
        input_data: toJson(parsed.data.input_data),
        output_data: toJson(parsed.data.output_data),
        expected_score: parsed.data.expected_score,
        reasoning: parsed.data.reasoning,
        sort_order: parsed.data.sort_order,
      })
      .run();

    const created = db
      .select()
      .from(rubric_examples)
      .where(eq(rubric_examples.id, exampleId))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/rubrics/[id]/examples error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

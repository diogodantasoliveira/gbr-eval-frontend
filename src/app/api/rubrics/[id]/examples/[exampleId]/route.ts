import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_examples } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateExampleSchema } from "@/lib/validations/rubric";
import { toJson } from "@/lib/db";
import { isValidId } from "@/lib/validations/params";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; exampleId: string }> }
) {
  try {
    const { id, exampleId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(exampleId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const example = db
      .select()
      .from(rubric_examples)
      .where(and(eq(rubric_examples.id, exampleId), eq(rubric_examples.rubric_id, id)))
      .get();

    if (!example) {
      return NextResponse.json({ error: "Example not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateExampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (d.input_data !== undefined) updateData.input_data = toJson(d.input_data);
    if (d.output_data !== undefined) updateData.output_data = toJson(d.output_data);
    if (d.expected_score !== undefined) updateData.expected_score = d.expected_score;
    if (d.reasoning !== undefined) updateData.reasoning = d.reasoning;
    if (d.sort_order !== undefined) updateData.sort_order = d.sort_order;

    db.update(rubric_examples)
      .set(updateData)
      .where(eq(rubric_examples.id, exampleId))
      .run();

    const updated = db
      .select()
      .from(rubric_examples)
      .where(eq(rubric_examples.id, exampleId))
      .get();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/rubrics/[id]/examples/[exampleId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; exampleId: string }> }
) {
  try {
    const { id, exampleId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(exampleId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const example = db
      .select()
      .from(rubric_examples)
      .where(and(eq(rubric_examples.id, exampleId), eq(rubric_examples.rubric_id, id)))
      .get();

    if (!example) {
      return NextResponse.json({ error: "Example not found" }, { status: 404 });
    }

    db.delete(rubric_examples).where(eq(rubric_examples.id, exampleId)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/rubrics/[id]/examples/[exampleId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

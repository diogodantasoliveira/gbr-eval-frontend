import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_criteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateCriterionSchema } from "@/lib/validations/rubric";
import { isValidId } from "@/lib/validations/params";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; criterionId: string }> }
) {
  try {
    const { id, criterionId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(criterionId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const criterion = db
      .select()
      .from(rubric_criteria)
      .where(and(eq(rubric_criteria.id, criterionId), eq(rubric_criteria.rubric_id, id)))
      .get();

    if (!criterion) {
      return NextResponse.json({ error: "Criterion not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateCriterionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const updates: Record<string, unknown> = {};
    if (d.criterion !== undefined) updates.criterion = d.criterion;
    if (d.weight !== undefined) updates.weight = d.weight;
    if (d.score_anchor_low !== undefined) updates.score_anchor_low = d.score_anchor_low;
    if (d.score_anchor_high !== undefined) updates.score_anchor_high = d.score_anchor_high;
    if (d.sort_order !== undefined) updates.sort_order = d.sort_order;

    db.update(rubric_criteria)
      .set(updates)
      .where(eq(rubric_criteria.id, criterionId))
      .run();

    const updated = db
      .select()
      .from(rubric_criteria)
      .where(eq(rubric_criteria.id, criterionId))
      .get();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/rubrics/[id]/criteria/[criterionId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; criterionId: string }> }
) {
  try {
    const { id, criterionId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(criterionId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const criterion = db
      .select()
      .from(rubric_criteria)
      .where(and(eq(rubric_criteria.id, criterionId), eq(rubric_criteria.rubric_id, id)))
      .get();

    if (!criterion) {
      return NextResponse.json({ error: "Criterion not found" }, { status: 404 });
    }

    db.delete(rubric_criteria).where(eq(rubric_criteria.id, criterionId)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/rubrics/[id]/criteria/[criterionId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

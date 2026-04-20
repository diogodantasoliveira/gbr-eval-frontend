import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubrics, rubric_criteria, rubric_examples, rubric_versions, rubric_ab_tests } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { updateRubricSchema } from "@/lib/validations/rubric";
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

    const criteria = db
      .select()
      .from(rubric_criteria)
      .where(eq(rubric_criteria.rubric_id, id))
      .orderBy(rubric_criteria.sort_order)
      .all();

    const examples = db
      .select()
      .from(rubric_examples)
      .where(eq(rubric_examples.rubric_id, id))
      .orderBy(rubric_examples.sort_order)
      .all();

    return NextResponse.json({ ...rubric, criteria, examples });
  } catch (err) {
    console.error("GET /api/rubrics/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateRubricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { change_reason, version: _version, ...rest } = parsed.data;
    const now = Date.now();
    const updates: Record<string, unknown> = { updated_at: now };

    if (rest.name !== undefined) updates.name = rest.name;
    if (rest.skill_id !== undefined) updates.skill_id = rest.skill_id;
    if (rest.category !== undefined) updates.category = rest.category;
    if (rest.min_score !== undefined) updates.min_score = rest.min_score;
    if (rest.model !== undefined) updates.model = rest.model;
    if (rest.status !== undefined) updates.status = rest.status;
    if (rest.promotion_status !== undefined) updates.promotion_status = rest.promotion_status;

    // If rubric_text is changing, snapshot current version first
    if (
      rest.rubric_text !== undefined &&
      rest.rubric_text !== rubric.rubric_text
    ) {
      updates.rubric_text = rest.rubric_text;
      updates.version = rubric.version + 1;
    }

    db.transaction((tx) => {
      if (
        rest.rubric_text !== undefined &&
        rest.rubric_text !== rubric.rubric_text
      ) {
        tx.insert(rubric_versions)
          .values({
            id: uuidv4(),
            rubric_id: id,
            version: rubric.version,
            rubric_text: rubric.rubric_text,
            changed_by: "system",
            changed_at: now,
            change_reason: change_reason ?? "",
          })
          .run();
      }

      tx.update(rubrics)
        .set(updates)
        .where(eq(rubrics.id, id))
        .run();
    });

    const updated = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/rubrics/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const abRef = db
      .select({ id: rubric_ab_tests.id })
      .from(rubric_ab_tests)
      .where(or(eq(rubric_ab_tests.rubric_a_id, id), eq(rubric_ab_tests.rubric_b_id, id)))
      .get();
    if (abRef) {
      return NextResponse.json(
        { error: "Rubric is referenced by an A/B test and cannot be deleted" },
        { status: 409 }
      );
    }

    db.delete(rubrics).where(eq(rubrics.id, id)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/rubrics/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

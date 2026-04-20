import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubrics, rubric_criteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createCriterionSchema } from "@/lib/validations/rubric";
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

    return NextResponse.json(criteria);
  } catch (err) {
    console.error("GET /api/rubrics/[id]/criteria error:", err instanceof Error ? err.message : "Unknown error");
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
    const parsed = createCriterionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const criterionId = uuidv4();

    db.insert(rubric_criteria)
      .values({
        id: criterionId,
        rubric_id: id,
        criterion: parsed.data.criterion,
        weight: parsed.data.weight,
        score_anchor_low: parsed.data.score_anchor_low,
        score_anchor_high: parsed.data.score_anchor_high,
        sort_order: parsed.data.sort_order,
      })
      .run();

    const created = db
      .select()
      .from(rubric_criteria)
      .where(eq(rubric_criteria.id, criterionId))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/rubrics/[id]/criteria error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

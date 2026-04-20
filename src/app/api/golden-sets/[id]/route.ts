import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_sets, golden_set_cases, skills } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { updateGoldenSetSchema } from "@/lib/validations/golden-set";
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

    const gs = db
      .select({
        id: golden_sets.id,
        name: golden_sets.name,
        description: golden_sets.description,
        status: golden_sets.status,
        skill_id: golden_sets.skill_id,
        created_by: golden_sets.created_by,
        created_at: golden_sets.created_at,
        updated_at: golden_sets.updated_at,
        version: golden_sets.version,
        skill_name: skills.name,
        skill_doc_type: skills.doc_type,
      })
      .from(golden_sets)
      .leftJoin(skills, eq(golden_sets.skill_id, skills.id))
      .where(eq(golden_sets.id, id))
      .get();

    if (!gs) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const caseSummary = db
      .select({
        status: golden_set_cases.status,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(golden_set_cases)
      .where(eq(golden_set_cases.golden_set_id, id))
      .groupBy(golden_set_cases.status)
      .all();

    const totalCases = caseSummary.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({ ...gs, total_cases: totalCases, cases_by_status: caseSummary });
  } catch (err) {
    console.error("GET /api/golden-sets/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const existing = db.select().from(golden_sets).where(eq(golden_sets.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateGoldenSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: Date.now() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    db.update(golden_sets).set(updates).where(eq(golden_sets.id, id)).run();

    const updated = db.select().from(golden_sets).where(eq(golden_sets.id, id)).get();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/golden-sets/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const existing = db.select().from(golden_sets).where(eq(golden_sets.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot delete a golden set that is not in draft status" },
        { status: 409 }
      );
    }

    db.delete(golden_sets).where(eq(golden_sets.id, id)).run();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/golden-sets/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { skills, skill_fields, golden_sets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateSkillSchema } from "@/lib/validations/skill";
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

    const skill = db.select().from(skills).where(eq(skills.id, id)).get();
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const fields = db
      .select()
      .from(skill_fields)
      .where(eq(skill_fields.skill_id, id))
      .orderBy(skill_fields.sort_order)
      .all();

    return NextResponse.json({ ...skill, fields });
  } catch (err) {
    console.error("GET /api/skills/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const skill = db.select().from(skills).where(eq(skills.id, id)).get();
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSkillSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const d = parsed.data;
    const updates: Record<string, unknown> = { updated_at: now };
    if (d.name !== undefined) updates.name = d.name;
    if (d.doc_type !== undefined) updates.doc_type = d.doc_type;
    if (d.version !== undefined) updates.version = d.version;
    if (d.description !== undefined) updates.description = d.description;
    if (d.priority !== undefined) updates.priority = d.priority;
    if (d.status !== undefined) updates.status = d.status;

    db.update(skills)
      .set(updates)
      .where(eq(skills.id, id))
      .run();

    const updated = db.select().from(skills).where(eq(skills.id, id)).get();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/skills/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const skill = db.select().from(skills).where(eq(skills.id, id)).get();
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Check if any golden sets reference this skill
    const references = db
      .select()
      .from(golden_sets)
      .where(eq(golden_sets.skill_id, id))
      .all();

    if (references.length > 0) {
      return NextResponse.json(
        {
          error: "Conflict: skill is referenced by golden sets",
          count: references.length,
        },
        { status: 409 }
      );
    }

    db.delete(skills).where(eq(skills.id, id)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/skills/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

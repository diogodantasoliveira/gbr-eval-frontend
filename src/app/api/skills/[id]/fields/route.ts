import { NextResponse } from "next/server";
import { db } from "@/db";
import { skills, skill_fields } from "@/db/schema";
import { eq, max } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createFieldSchema } from "@/lib/validations/skill";
import { criticalityWeight } from "@/lib/skills/utils";
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

    return NextResponse.json(fields);
  } catch (err) {
    console.error("GET /api/skills/[id]/fields error:", err instanceof Error ? err.message : "Unknown error");
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

    const skill = db.select().from(skills).where(eq(skills.id, id)).get();
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Get current max sort_order
    const maxResult = db
      .select({ maxOrder: max(skill_fields.sort_order) })
      .from(skill_fields)
      .where(eq(skill_fields.skill_id, id))
      .get();

    const nextOrder = (maxResult?.maxOrder ?? -1) + 1;
    const fieldId = uuidv4();
    const weight = criticalityWeight(parsed.data.criticality);

    db.insert(skill_fields)
      .values({
        id: fieldId,
        skill_id: id,
        field_name: parsed.data.field_name,
        field_type: parsed.data.field_type,
        criticality: parsed.data.criticality,
        weight,
        required: parsed.data.required ? 1 : 0,
        validation_pattern: parsed.data.validation_pattern ?? null,
        description: parsed.data.description ?? "",
        sort_order: nextOrder,
      })
      .run();

    const created = db
      .select()
      .from(skill_fields)
      .where(eq(skill_fields.id, fieldId))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/skills/[id]/fields error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

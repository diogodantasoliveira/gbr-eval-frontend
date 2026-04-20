import { NextResponse } from "next/server";
import { db } from "@/db";
import { skill_fields } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateFieldSchema } from "@/lib/validations/skill";
import { criticalityWeight } from "@/lib/skills/utils";
import { isValidId } from "@/lib/validations/params";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id, fieldId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(fieldId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const field = db
      .select()
      .from(skill_fields)
      .where(and(eq(skill_fields.id, fieldId), eq(skill_fields.skill_id, id)))
      .get();

    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (d.field_name !== undefined) updateData.field_name = d.field_name;
    if (d.field_type !== undefined) updateData.field_type = d.field_type;
    if (d.criticality !== undefined) {
      updateData.criticality = d.criticality;
      // Auto-update weight when criticality changes
      updateData.weight = criticalityWeight(d.criticality);
    }
    if (d.required !== undefined) updateData.required = d.required ? 1 : 0;
    if (d.validation_pattern !== undefined) updateData.validation_pattern = d.validation_pattern;
    if (d.description !== undefined) updateData.description = d.description;

    db.update(skill_fields)
      .set(updateData)
      .where(eq(skill_fields.id, fieldId))
      .run();

    const updated = db
      .select()
      .from(skill_fields)
      .where(eq(skill_fields.id, fieldId))
      .get();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/skills/[id]/fields/[fieldId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id, fieldId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(fieldId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const field = db
      .select()
      .from(skill_fields)
      .where(and(eq(skill_fields.id, fieldId), eq(skill_fields.skill_id, id)))
      .get();

    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    db.delete(skill_fields).where(eq(skill_fields.id, fieldId)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/skills/[id]/fields/[fieldId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { convention_rules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateConventionSchema } from "@/lib/validations/convention";
import { isValidRegex } from "@/lib/validations/regex";
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
    const rule = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.id, id))
      .get();
    if (!rule) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rule);
  } catch (err) {
    console.error("GET /api/conventions/[id] error:", err instanceof Error ? err.message : "Unknown error");
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
    const existing = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.id, id))
      .get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateConventionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Validate regex pattern if detection_type is "regex"
    const detectionType = parsed.data.detection_type ?? existing.detection_type;
    const detectionPattern = parsed.data.detection_pattern ?? existing.detection_pattern;
    if (detectionType === "regex" && detectionPattern) {
      const regexCheck = isValidRegex(detectionPattern);
      if (!regexCheck.valid) {
        return NextResponse.json(
          { error: regexCheck.error },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, unknown> = { updated_at: Date.now() };
    const d = parsed.data;
    if (d.name !== undefined) updates.name = d.name;
    if (d.category !== undefined) updates.category = d.category;
    if (d.severity !== undefined) updates.severity = d.severity;
    if (d.description !== undefined) updates.description = d.description;
    if (d.detection_pattern !== undefined) updates.detection_pattern = d.detection_pattern;
    if (d.detection_type !== undefined) updates.detection_type = d.detection_type;
    if (d.positive_example !== undefined) updates.positive_example = d.positive_example;
    if (d.negative_example !== undefined) updates.negative_example = d.negative_example;
    if (d.source !== undefined) updates.source = d.source;
    if (d.status !== undefined) updates.status = d.status;

    db.update(convention_rules).set(updates).where(eq(convention_rules.id, id)).run();

    const updated = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.id, id))
      .get();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/conventions/[id] error:", err instanceof Error ? err.message : "Unknown error");
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
    const existing = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.id, id))
      .get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    db.delete(convention_rules).where(eq(convention_rules.id, id)).run();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/conventions/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_set_cases, golden_set_versions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { updateCaseSchema } from "@/lib/validations/golden-set";
import { safeJsonParse, toJson } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";

function parseCase(c: typeof golden_set_cases.$inferSelect) {
  return {
    ...c,
    tags: safeJsonParse<string[]>(c.tags ?? "[]", []),
    expected_output: redactRecord(safeJsonParse<Record<string, unknown>>(c.expected_output ?? "{}", {})),
    citation: redactRecord(safeJsonParse<Record<string, unknown>>(c.citation ?? "{}", {})),
    input_data: redactRecord(safeJsonParse<Record<string, unknown>>(c.input_data ?? "{}", {})),
    field_annotations: redactRecord(safeJsonParse<Record<string, unknown>>(c.field_annotations ?? "{}", {})),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { id, caseId } = await params;

    if (!isValidId(id) || !isValidId(caseId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const c = db
      .select()
      .from(golden_set_cases)
      .where(and(eq(golden_set_cases.id, caseId), eq(golden_set_cases.golden_set_id, id)))
      .get();

    if (!c) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(parseCase(c));
  } catch (err) {
    console.error("GET /api/golden-sets/[id]/cases/[caseId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { id, caseId } = await params;

    if (!isValidId(id) || !isValidId(caseId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(golden_set_cases)
      .where(and(eq(golden_set_cases.id, caseId), eq(golden_set_cases.golden_set_id, id)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      expected_output,
      change_reason,
      status,
      tags,
      citation,
      input_data,
      field_annotations,
      ...rest
    } = parsed.data;

    const now = Date.now();
    const updates: Record<string, unknown> = { updated_at: now };

    // If expected_output is changing, snapshot current version first
    const newExpectedOutput = expected_output !== undefined ? expected_output : undefined;
    if (newExpectedOutput !== undefined) {
      updates.expected_output = toJson(newExpectedOutput);
      updates.version = existing.version + 1;
    }

    if (tags !== undefined) updates.tags = toJson(tags);
    if (citation !== undefined) updates.citation = toJson(citation);
    if (status !== undefined) updates.status = status;
    if (rest.document_hash !== undefined) updates.document_hash = rest.document_hash;
    if (rest.document_source !== undefined) updates.document_source = rest.document_source;
    if (rest.annotator !== undefined) updates.annotator = rest.annotator;
    if (rest.notes !== undefined) updates.notes = rest.notes;
    if (input_data !== undefined) updates.input_data = toJson(input_data);
    if (field_annotations !== undefined) updates.field_annotations = toJson(field_annotations);

    db.transaction((tx) => {
      if (newExpectedOutput !== undefined) {
        tx.insert(golden_set_versions).values({
          id: uuidv4(),
          case_id: caseId,
          version: existing.version,
          expected_output: existing.expected_output ?? "{}",
          changed_by: rest.annotator ?? existing.annotator ?? "system",
          changed_at: now,
          change_reason: change_reason ?? "",
        }).run();
      }

      tx.update(golden_set_cases).set(updates).where(eq(golden_set_cases.id, caseId)).run();
    });

    const updated = db
      .select()
      .from(golden_set_cases)
      .where(eq(golden_set_cases.id, caseId))
      .get();

    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json(parseCase(updated));
  } catch (err) {
    console.error("PUT /api/golden-sets/[id]/cases/[caseId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { id, caseId } = await params;

    if (!isValidId(id) || !isValidId(caseId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(golden_set_cases)
      .where(and(eq(golden_set_cases.id, caseId), eq(golden_set_cases.golden_set_id, id)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // versions cascade via FK
    db.delete(golden_set_cases).where(eq(golden_set_cases.id, caseId)).run();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/golden-sets/[id]/cases/[caseId] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

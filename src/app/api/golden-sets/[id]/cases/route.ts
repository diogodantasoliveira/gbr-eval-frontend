import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_sets, golden_set_cases } from "@/db/schema";
import { and, eq, max } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createCaseSchema } from "@/lib/validations/golden-set";
import { safeJsonParse, toJson } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const tagsParam = searchParams.get("tags");
    const statusParam = searchParams.get("status");

    const gs = db.select().from(golden_sets).where(eq(golden_sets.id, id)).get();
    if (!gs) {
      return NextResponse.json({ error: "Golden set not found" }, { status: 404 });
    }

    const conditions = [eq(golden_set_cases.golden_set_id, id)];
    if (statusParam) {
      conditions.push(eq(golden_set_cases.status, statusParam));
    }

    let cases = db
      .select()
      .from(golden_set_cases)
      .where(and(...conditions))
      .all();

    if (tagsParam) {
      const requiredTags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
      cases = cases.filter((c) => {
        const tags = safeJsonParse<string[]>(c.tags ?? "[]", []);
        return requiredTags.every((tag) => tags.includes(tag));
      });
    }

    const total = cases.length;
    const paged = cases.slice(offset, offset + limit);

    const parsed = paged.map((c) => ({
      ...c,
      tags: safeJsonParse<string[]>(c.tags ?? "[]", []),
      expected_output: redactRecord(safeJsonParse<Record<string, unknown>>(c.expected_output ?? "{}", {})),
      citation: redactRecord(safeJsonParse<Record<string, unknown>>(c.citation ?? "{}", {})),
      input_data: redactRecord(safeJsonParse<Record<string, unknown>>(c.input_data ?? "{}", {})),
      field_annotations: redactRecord(safeJsonParse<Record<string, unknown>>(c.field_annotations ?? "{}", {})),
    }));

    return NextResponse.json({ data: parsed, total });
  } catch (err) {
    console.error("GET /api/golden-sets/[id]/cases error:", err instanceof Error ? err.message : "Unknown error");
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

    const gs = db.select().from(golden_sets).where(eq(golden_sets.id, id)).get();
    if (!gs) {
      return NextResponse.json({ error: "Golden set not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const caseId = uuidv4();

    const created = db.transaction((tx) => {
      const maxResult = tx
        .select({ maxNum: max(golden_set_cases.case_number) })
        .from(golden_set_cases)
        .where(eq(golden_set_cases.golden_set_id, id))
        .get();

      const case_number = (maxResult?.maxNum ?? 0) + 1;

      tx.insert(golden_set_cases).values({
        id: caseId,
        golden_set_id: id,
        case_number,
        document_hash: parsed.data.document_hash,
        document_source: parsed.data.document_source,
        annotator: parsed.data.annotator,
        notes: parsed.data.notes,
        tags: toJson(parsed.data.tags),
        expected_output: toJson(parsed.data.expected_output),
        citation: toJson(parsed.data.citation),
        input_data: toJson(parsed.data.input_data),
        field_annotations: toJson(parsed.data.field_annotations),
        status: "draft",
        created_at: now,
        updated_at: now,
        version: 1,
      }).run();

      return tx
        .select()
        .from(golden_set_cases)
        .where(eq(golden_set_cases.id, caseId))
        .get();
    });

    if (!created) {
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ...created,
        tags: safeJsonParse<string[]>(created.tags ?? "[]", []),
        expected_output: redactRecord(safeJsonParse<Record<string, unknown>>(created.expected_output ?? "{}", {})),
        citation: redactRecord(safeJsonParse<Record<string, unknown>>(created.citation ?? "{}", {})),
        input_data: redactRecord(safeJsonParse<Record<string, unknown>>(created.input_data ?? "{}", {})),
        field_annotations: redactRecord(safeJsonParse<Record<string, unknown>>(created.field_annotations ?? "{}", {})),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/golden-sets/[id]/cases error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

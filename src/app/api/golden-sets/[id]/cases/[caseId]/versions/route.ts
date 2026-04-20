import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_set_cases, golden_set_versions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const { id, caseId } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }
    if (!isValidId(caseId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const caseRow = db
      .select()
      .from(golden_set_cases)
      .where(and(eq(golden_set_cases.id, caseId), eq(golden_set_cases.golden_set_id, id)))
      .get();

    if (!caseRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const versions = db
      .select()
      .from(golden_set_versions)
      .where(eq(golden_set_versions.case_id, caseId))
      .orderBy(desc(golden_set_versions.version))
      .all();

    const parsed = versions.map((v) => ({
      ...v,
      expected_output: redactRecord(safeJsonParse<Record<string, unknown>>(v.expected_output, {})),
    }));

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("GET /api/golden-sets/[id]/cases/[caseId]/versions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

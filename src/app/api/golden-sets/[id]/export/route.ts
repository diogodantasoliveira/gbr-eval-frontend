import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_sets, golden_set_cases, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
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
        skill_id: golden_sets.skill_id,
        skill_doc_type: skills.doc_type,
      })
      .from(golden_sets)
      .leftJoin(skills, eq(golden_sets.skill_id, skills.id))
      .where(eq(golden_sets.id, id))
      .get();

    if (!gs) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cases = db
      .select()
      .from(golden_set_cases)
      .where(eq(golden_set_cases.golden_set_id, id))
      .all();

    const exportableCases = cases.filter((c) =>
      c.status === "approved" || c.status === "annotated"
    );

    const exported = exportableCases.map((c) => {
      const expectedOutput = safeJsonParse<Record<string, unknown>>(c.expected_output ?? "{}", {});
      const citation = safeJsonParse<Record<string, unknown>>(c.citation ?? "{}", {});
      const tags = safeJsonParse<string[]>(c.tags ?? "[]", []);

      // Prepend document_type from skill
      const enrichedOutput: Record<string, unknown> = {};
      if (gs.skill_doc_type) {
        enrichedOutput.document_type = gs.skill_doc_type;
      }
      Object.assign(enrichedOutput, expectedOutput);

      return {
        case_number: c.case_number,
        document_hash: c.document_hash ?? "sha256:PENDING_COMPUTE",
        tags,
        annotator: c.annotator ?? "",
        reviewed_by: c.reviewer ?? null,
        created_at: new Date(c.created_at).toISOString(),
        document_source: c.document_source ?? "",
        notes: c.notes ?? "",
        expected_output: redactRecord(enrichedOutput),
        citation: redactRecord(citation),
      };
    });

    const fileName = `golden-set-${id}-export.json`;

    return new NextResponse(JSON.stringify(exported, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/golden-sets/[id]/export error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

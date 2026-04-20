import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_sets, golden_set_cases } from "@/db/schema";
import { eq, max } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { importCasesSchema } from "@/lib/validations/golden-set";
import { toJson } from "@/lib/db";
import { scanForPii } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";

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
    const parsed = importCasesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const cases = parsed.data;

    // Fetch existing case numbers for this golden set (for idempotency check)
    const existingCases = db
      .select({ case_number: golden_set_cases.case_number })
      .from(golden_set_cases)
      .where(eq(golden_set_cases.golden_set_id, id))
      .all();
    const existingCaseNumbers = new Set(existingCases.map((c) => c.case_number));

    // Get the current max case_number for auto-assignment
    const maxResult = db
      .select({ maxNum: max(golden_set_cases.case_number) })
      .from(golden_set_cases)
      .where(eq(golden_set_cases.golden_set_id, id))
      .get();
    let nextCaseNumber = (maxResult?.maxNum ?? 0) + 1;

    let imported = 0;
    const errors: Array<{ index: number; error: string }> = [];
    const warnings: Array<{ index: number; piiFields: string[] }> = [];

    db.transaction((tx) => {
      for (let i = 0; i < cases.length; i++) {
        const c = cases[i];

        try {
          // Determine case_number
          let caseNumber: number;
          if (c.case_number !== undefined) {
            if (existingCaseNumbers.has(c.case_number)) {
              // Skip — idempotent
              continue;
            }
            caseNumber = c.case_number;
          } else {
            // Auto-assign, skip if collision
            while (existingCaseNumbers.has(nextCaseNumber)) {
              nextCaseNumber++;
            }
            caseNumber = nextCaseNumber;
            nextCaseNumber++;
          }

          // Strip document_type from expected_output
          const expectedOutput = { ...(c.expected_output ?? {}) };
          delete expectedOutput["document_type"];

          const citation = c.citation ?? {};
          const piiScan = scanForPii({ ...expectedOutput, ...citation });
          if (piiScan.hasPii) {
            warnings.push({
              index: i,
              piiFields: piiScan.findings.map((f) => f.field),
            });
          }

          const now = Date.now();
          const caseId = uuidv4();

          tx.insert(golden_set_cases).values({
            id: caseId,
            golden_set_id: id,
            case_number: caseNumber,
            document_hash: c.document_hash ?? "sha256:PENDING_COMPUTE",
            document_source: c.document_source ?? "",
            annotator: c.annotator ?? "",
            reviewer: c.reviewed_by ?? null,
            notes: c.notes ?? "",
            tags: toJson(c.tags ?? []),
            expected_output: toJson(expectedOutput),
            citation: toJson(citation),
            input_data: "{}",
            field_annotations: "{}",
            status: "annotated",
            created_at: c.created_at ? new Date(c.created_at).getTime() : now,
            updated_at: now,
            version: 1,
          }).run();

          existingCaseNumbers.add(caseNumber);
          imported++;
        } catch (err) {
          errors.push({
            index: i,
            error: err instanceof Error ? err.message : "Failed to import case",
          });
        }
      }
    });

    return NextResponse.json({ imported, errors, warnings });
  } catch (err) {
    console.error("POST /api/golden-sets/[id]/import error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

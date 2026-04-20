import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_annotations,
  skill_fields,
  golden_set_cases,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { computeCohensKappa } from "@/lib/calibration/kappa";
import { isValidId } from "@/lib/validations/params";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const session = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Session is already completed" },
        { status: 409 }
      );
    }

    // Get all annotations for this session
    const allAnnotations = db
      .select()
      .from(calibration_annotations)
      .where(eq(calibration_annotations.session_id, id))
      .all();

    // Get all cases in the golden set to determine ordering
    const cases = db
      .select()
      .from(golden_set_cases)
      .where(eq(golden_set_cases.golden_set_id, session.golden_set_id))
      .orderBy(golden_set_cases.case_number)
      .all();

    // Get skill fields for kappa computation
    const fields = db
      .select()
      .from(skill_fields)
      .where(eq(skill_fields.skill_id, session.skill_id))
      .all();

    const fieldNames = fields.map((f) => f.field_name);

    // Group annotations by case_id, then by annotator
    const byCase = new Map<
      string,
      { ann1: Record<string, string> | null; ann2: Record<string, string> | null }
    >();

    for (const c of cases) {
      byCase.set(c.id, { ann1: null, ann2: null });
    }

    for (const ann of allAnnotations) {
      const entry = byCase.get(ann.case_id);
      if (!entry) continue;

      const parsed = safeJsonParse<Record<string, unknown>>(ann.annotations, {});
      // Convert all values to strings for kappa computation
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        normalized[k] = String(v ?? "");
      }

      if (ann.annotator === session.annotator_1) {
        entry.ann1 = normalized;
      } else if (ann.annotator === session.annotator_2) {
        entry.ann2 = normalized;
      }
    }

    // Build parallel arrays for cases where both annotators submitted
    const annotations1: Record<string, string>[] = [];
    const annotations2: Record<string, string>[] = [];

    for (const entry of byCase.values()) {
      if (entry.ann1 && entry.ann2) {
        annotations1.push(entry.ann1);
        annotations2.push(entry.ann2);
      }
    }

    const kappa = computeCohensKappa(annotations1, annotations2, fieldNames);

    const now = Date.now();

    db.update(calibration_sessions)
      .set({
        status: "completed",
        cohens_kappa: kappa.overall,
        completed_at: now,
      })
      .where(eq(calibration_sessions.id, id))
      .run();

    return NextResponse.json({
      session_id: id,
      kappa: kappa.overall,
      per_field: kappa.per_field,
      annotated_cases: annotations1.length,
      total_cases: cases.length,
    });
  } catch (err) {
    console.error("POST /api/calibration/sessions/[id]/complete error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

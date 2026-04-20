import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_disagreements,
  golden_set_cases,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redactString } from "@/lib/pii/redactor";
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

    const session = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const disagreements = db
      .select({
        id: calibration_disagreements.id,
        session_id: calibration_disagreements.session_id,
        case_id: calibration_disagreements.case_id,
        field_name: calibration_disagreements.field_name,
        annotator_1_value: calibration_disagreements.annotator_1_value,
        annotator_2_value: calibration_disagreements.annotator_2_value,
        resolution: calibration_disagreements.resolution,
        resolved_by: calibration_disagreements.resolved_by,
        resolved_at: calibration_disagreements.resolved_at,
        case_number: golden_set_cases.case_number,
      })
      .from(calibration_disagreements)
      .leftJoin(
        golden_set_cases,
        eq(calibration_disagreements.case_id, golden_set_cases.id)
      )
      .where(eq(calibration_disagreements.session_id, id))
      .all();

    const redacted = disagreements.map((d) => ({
      ...d,
      annotator_1_value: d.annotator_1_value ? redactString(d.annotator_1_value).value : d.annotator_1_value,
      annotator_2_value: d.annotator_2_value ? redactString(d.annotator_2_value).value : d.annotator_2_value,
      resolution: d.resolution ? redactString(d.resolution).value : d.resolution,
    }));

    return NextResponse.json(redacted);
  } catch (err) {
    console.error("GET /api/calibration/sessions/[id]/disagreements error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

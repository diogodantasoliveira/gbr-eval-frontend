import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_disagreements,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveDisagreementSchema } from "@/lib/validations/calibration";
import { redactString } from "@/lib/pii/redactor";
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

    const session = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = resolveDisagreementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { disagreement_id, resolution, resolved_by } = parsed.data;

    const disagreement = db
      .select()
      .from(calibration_disagreements)
      .where(eq(calibration_disagreements.id, disagreement_id))
      .get();

    if (!disagreement) {
      return NextResponse.json({ error: "Disagreement not found" }, { status: 404 });
    }

    if (disagreement.session_id !== id) {
      return NextResponse.json(
        { error: "Disagreement does not belong to this session" },
        { status: 422 }
      );
    }

    const now = Date.now();

    db.update(calibration_disagreements)
      .set({ resolution, resolved_by, resolved_at: now })
      .where(eq(calibration_disagreements.id, disagreement_id))
      .run();

    const updated = db
      .select()
      .from(calibration_disagreements)
      .where(eq(calibration_disagreements.id, disagreement_id))
      .get();

    return NextResponse.json({
      ...updated,
      annotator_1_value: updated?.annotator_1_value ? redactString(updated.annotator_1_value).value : updated?.annotator_1_value,
      annotator_2_value: updated?.annotator_2_value ? redactString(updated.annotator_2_value).value : updated?.annotator_2_value,
      resolution: updated?.resolution ? redactString(updated.resolution).value : updated?.resolution,
    });
  } catch (err) {
    console.error("POST /api/calibration/sessions/[id]/resolve error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

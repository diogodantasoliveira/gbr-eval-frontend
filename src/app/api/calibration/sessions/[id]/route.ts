import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_annotations,
  calibration_disagreements,
  skills,
  golden_sets,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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

    const skill = db.select().from(skills).where(eq(skills.id, session.skill_id)).get();
    const goldenSet = db
      .select()
      .from(golden_sets)
      .where(eq(golden_sets.id, session.golden_set_id))
      .get();

    const annotationsCount = db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(calibration_annotations)
      .where(eq(calibration_annotations.session_id, id))
      .get();

    const disagreementsCount = db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(calibration_disagreements)
      .where(eq(calibration_disagreements.session_id, id))
      .get();

    return NextResponse.json({
      ...session,
      skill_name: skill?.name ?? null,
      golden_set_name: goldenSet?.name ?? null,
      annotations_count: annotationsCount?.count ?? 0,
      disagreements_count: disagreementsCount?.count ?? 0,
    });
  } catch (err) {
    console.error("GET /api/calibration/sessions/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const session = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    db.delete(calibration_sessions).where(eq(calibration_sessions.id, id)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/calibration/sessions/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

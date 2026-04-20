import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  calibration_sessions,
  skills,
  golden_sets,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createSessionSchema } from "@/lib/validations/calibration";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const skill_id = url.searchParams.get("skill_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: import("drizzle-orm").SQL[] = [];
    if (skill_id) conditions.push(eq(calibration_sessions.skill_id, skill_id));

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(calibration_sessions)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select({
        id: calibration_sessions.id,
        skill_id: calibration_sessions.skill_id,
        golden_set_id: calibration_sessions.golden_set_id,
        annotator_1: calibration_sessions.annotator_1,
        annotator_2: calibration_sessions.annotator_2,
        status: calibration_sessions.status,
        cohens_kappa: calibration_sessions.cohens_kappa,
        started_at: calibration_sessions.started_at,
        completed_at: calibration_sessions.completed_at,
        skill_name: skills.name,
        golden_set_name: golden_sets.name,
      })
      .from(calibration_sessions)
      .leftJoin(skills, eq(calibration_sessions.skill_id, skills.id))
      .leftJoin(golden_sets, eq(calibration_sessions.golden_set_id, golden_sets.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: rows, total });
  } catch (err) {
    console.error("GET /api/calibration/sessions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { skill_id, golden_set_id, annotator_1, annotator_2 } = parsed.data;

    const skill = db.select().from(skills).where(eq(skills.id, skill_id)).get();
    if (!skill) {
      return NextResponse.json({ error: "skill_id not found" }, { status: 422 });
    }

    const goldenSet = db
      .select()
      .from(golden_sets)
      .where(eq(golden_sets.id, golden_set_id))
      .get();
    if (!goldenSet) {
      return NextResponse.json({ error: "golden_set_id not found" }, { status: 422 });
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(calibration_sessions)
      .values({
        id,
        skill_id,
        golden_set_id,
        annotator_1,
        annotator_2,
        status: "in_progress",
        started_at: now,
      })
      .run();

    const created = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.id, id))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/calibration/sessions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

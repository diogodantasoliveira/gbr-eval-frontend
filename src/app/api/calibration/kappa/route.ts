import { NextResponse } from "next/server";
import { db } from "@/db";
import { calibration_sessions, skills } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const completed = db
      .select({
        id: calibration_sessions.id,
        skill_id: calibration_sessions.skill_id,
        cohens_kappa: calibration_sessions.cohens_kappa,
        completed_at: calibration_sessions.completed_at,
        skill_name: skills.name,
      })
      .from(calibration_sessions)
      .leftJoin(skills, eq(calibration_sessions.skill_id, skills.id))
      .where(eq(calibration_sessions.status, "completed"))
      .all();

    // Group by skill_id and compute average kappa
    const bySkill = new Map<
      string,
      { skill_id: string; skill_name: string | null; kappas: number[]; session_count: number }
    >();

    for (const row of completed) {
      if (row.cohens_kappa === null) continue;
      const entry = bySkill.get(row.skill_id) ?? {
        skill_id: row.skill_id,
        skill_name: row.skill_name ?? null,
        kappas: [],
        session_count: 0,
      };
      entry.kappas.push(row.cohens_kappa);
      entry.session_count++;
      bySkill.set(row.skill_id, entry);
    }

    const result = Array.from(bySkill.values()).map((entry) => {
      const avg =
        entry.kappas.reduce((sum, k) => sum + k, 0) / entry.kappas.length;
      return {
        skill_id: entry.skill_id,
        skill_name: entry.skill_name,
        average_kappa: avg,
        session_count: entry.session_count,
        latest_kappa: entry.kappas[entry.kappas.length - 1],
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/calibration/kappa error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubrics, calibration_sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const url = new URL(req.url);
    const kappaThreshold = parseFloat(url.searchParams.get("kappa_threshold") ?? "0.75");
    if (isNaN(kappaThreshold) || kappaThreshold < 0 || kappaThreshold > 1) {
      return NextResponse.json({ error: "kappa_threshold must be between 0 and 1" }, { status: 400 });
    }

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    if (!rubric.skill_id) {
      return NextResponse.json(
        { error: "Rubric has no associated skill — cannot compute kappa" },
        { status: 422 }
      );
    }

    // Find the latest completed session kappa for this rubric's skill
    const completedSessions = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.skill_id, rubric.skill_id))
      .all()
      .filter((s) => s.status === "completed" && s.cohens_kappa !== null);

    if (completedSessions.length === 0) {
      return NextResponse.json(
        { error: "No completed calibration sessions found for this skill", promoted: false, kappa: null, threshold: kappaThreshold },
        { status: 422 }
      );
    }

    // Use average kappa across all completed sessions for this skill
    const kappas = completedSessions.map((s) => s.cohens_kappa as number);
    const avgKappa = kappas.reduce((sum, k) => sum + k, 0) / kappas.length;

    if (avgKappa < kappaThreshold) {
      return NextResponse.json({
        promoted: false,
        kappa: avgKappa,
        threshold: kappaThreshold,
        message: `Kappa ${avgKappa.toFixed(3)} is below threshold ${kappaThreshold}`,
      });
    }

    // Promote
    db.update(rubrics)
      .set({ promotion_status: "blocking", updated_at: Date.now() })
      .where(eq(rubrics.id, id))
      .run();

    return NextResponse.json({
      promoted: true,
      kappa: avgKappa,
      threshold: kappaThreshold,
      message: `Rubric promoted to blocking (kappa ${avgKappa.toFixed(3)} >= ${kappaThreshold})`,
    });
  } catch (err) {
    console.error("POST /api/rubrics/[id]/promote error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

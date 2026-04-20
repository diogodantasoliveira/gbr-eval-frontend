import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_concordance_tests, rubrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidId } from "@/lib/validations/params";

function getRecommendation(avgConcordance: number, totalTests: number, minTests: number, readyThreshold: number): string {
  if (totalTests < minTests) return "needs_more_tests";
  if (avgConcordance >= readyThreshold) return "ready_for_blocking";
  return "inconsistent";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const url = new URL(req.url);
    const minTests = parseInt(url.searchParams.get("min_tests") ?? "10", 10);
    const readyThreshold = parseFloat(url.searchParams.get("ready_threshold") ?? "0.9");

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const tests = db
      .select()
      .from(rubric_concordance_tests)
      .where(eq(rubric_concordance_tests.rubric_id, id))
      .all();

    const total_tests = tests.length;
    const avg_concordance =
      total_tests === 0
        ? 0
        : tests.reduce((s, t) => s + t.concordance_score, 0) / total_tests;

    const recommendation = getRecommendation(avg_concordance, total_tests, minTests, readyThreshold);

    return NextResponse.json({
      avg_concordance,
      total_tests,
      recommendation,
    });
  } catch (err) {
    console.error("GET /api/rubrics/[id]/concordance/summary error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

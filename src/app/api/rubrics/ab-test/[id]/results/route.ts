import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_ab_tests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { submitResultsSchema } from "@/lib/validations/ab-test";
import { isValidId } from "@/lib/validations/params";

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function computeWinner(avgA: number, avgB: number): string {
  if (Math.abs(avgA - avgB) < 0.001) return "tie";
  return avgA > avgB ? "a" : "b";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const test = db.select().from(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).get();
    if (!test) {
      return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = submitResultsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { results_a, results_b } = parsed.data;
    const avgA = avg(results_a);
    const avgB = avg(results_b);
    const winner = computeWinner(avgA, avgB);
    const now = Date.now();

    db.update(rubric_ab_tests)
      .set({
        results_a: JSON.stringify(results_a),
        results_b: JSON.stringify(results_b),
        winner,
        status: "completed",
        completed_at: now,
      })
      .where(eq(rubric_ab_tests.id, id))
      .run();

    const updated = db.select().from(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).get();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/rubrics/ab-test/[id]/results error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

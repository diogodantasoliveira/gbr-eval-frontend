import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_concordance_tests, rubrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { submitConcordanceSchema } from "@/lib/validations/ab-test";
import { isValidId } from "@/lib/validations/params";

function stdev(arr: number[]): number {
  const n = arr.length;
  if (n < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

function computeConcordance(scores: number[]): number {
  // concordance = 1 - (stdev / 2.0), clamped to [0, 1]
  const MAX_STDEV = 2.0;
  const raw = 1 - stdev(scores) / MAX_STDEV;
  return Math.max(0, Math.min(1, raw));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const tests = db
      .select()
      .from(rubric_concordance_tests)
      .where(eq(rubric_concordance_tests.rubric_id, id))
      .all();

    return NextResponse.json(tests);
  } catch (err) {
    console.error("GET /api/rubrics/[id]/concordance error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = submitConcordanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { case_id, scores } = parsed.data;
    const concordance_score = computeConcordance(scores);
    const now = Date.now();
    const testId = uuidv4();

    db.insert(rubric_concordance_tests)
      .values({
        id: testId,
        rubric_id: id,
        case_id,
        scores: JSON.stringify(scores),
        concordance_score,
        created_at: now,
      })
      .run();

    const created = db
      .select()
      .from(rubric_concordance_tests)
      .where(eq(rubric_concordance_tests.id, testId))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/rubrics/[id]/concordance error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

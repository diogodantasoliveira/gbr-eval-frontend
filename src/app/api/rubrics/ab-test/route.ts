import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_ab_tests, rubrics, golden_sets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createAbTestSchema } from "@/lib/validations/ab-test";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(rubric_ab_tests)
      .get();
    const total = totalRow?.count ?? 0;

    const tests = db.select().from(rubric_ab_tests).limit(limit).offset(offset).all();
    return NextResponse.json({ data: tests, total });
  } catch (err) {
    console.error("GET /api/rubrics/ab-test error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createAbTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, rubric_a_id, rubric_b_id, golden_set_id } = parsed.data;

    // Verify references exist
    const rubricA = db.select().from(rubrics).where(eq(rubrics.id, rubric_a_id)).get();
    if (!rubricA) {
      return NextResponse.json({ error: "rubric_a_id not found" }, { status: 422 });
    }

    const rubricB = db.select().from(rubrics).where(eq(rubrics.id, rubric_b_id)).get();
    if (!rubricB) {
      return NextResponse.json({ error: "rubric_b_id not found" }, { status: 422 });
    }

    const goldenSet = db.select().from(golden_sets).where(eq(golden_sets.id, golden_set_id)).get();
    if (!goldenSet) {
      return NextResponse.json({ error: "golden_set_id not found" }, { status: 422 });
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(rubric_ab_tests)
      .values({
        id,
        name,
        rubric_a_id,
        rubric_b_id,
        golden_set_id,
        status: "pending",
        results_a: "[]",
        results_b: "[]",
        winner: null,
        created_at: now,
        completed_at: null,
      })
      .run();

    const created = db.select().from(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/rubrics/ab-test error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

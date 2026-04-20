import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubrics } from "@/db/schema";
import { eq, and, sql, SQL } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createRubricSchema } from "@/lib/validations/rubric";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const skill_id = searchParams.get("skill_id");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (skill_id) conditions.push(eq(rubrics.skill_id, skill_id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(rubrics)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select()
      .from(rubrics)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: rows, total });
  } catch (err) {
    console.error("GET /api/rubrics error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createRubricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(rubrics)
      .values({
        id,
        name: parsed.data.name,
        skill_id: parsed.data.skill_id ?? null,
        category: parsed.data.category,
        rubric_text: parsed.data.rubric_text,
        min_score: parsed.data.min_score,
        model: parsed.data.model,
        status: parsed.data.status,
        promotion_status: "informative",
        version: 1,
        created_at: now,
        updated_at: now,
      })
      .run();

    const created = db.select().from(rubrics).where(eq(rubrics.id, id)).get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/rubrics error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

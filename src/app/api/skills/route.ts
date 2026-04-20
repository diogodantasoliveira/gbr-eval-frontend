import { NextResponse } from "next/server";
import { db } from "@/db";
import { skills, skill_fields } from "@/db/schema";
import { eq, sql, SQL, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createSkillSchema } from "@/lib/validations/skill";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(skills.status, status));

    const allSkills = db
      .select()
      .from(skills)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .all();

    // Get field counts per skill
    const fieldCounts = db
      .select({
        skill_id: skill_fields.skill_id,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(skill_fields)
      .groupBy(skill_fields.skill_id)
      .all();

    const countMap = new Map(fieldCounts.map((r) => [r.skill_id, r.count]));

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(skills)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .get();
    const total = totalRow?.count ?? 0;

    const result = allSkills.map((s) => ({
      ...s,
      field_count: countMap.get(s.id) ?? 0,
    }));

    return NextResponse.json({ data: result, total });
  } catch (err) {
    console.error("GET /api/skills error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSkillSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(skills)
      .values({
        id,
        name: parsed.data.name,
        doc_type: parsed.data.doc_type,
        version: parsed.data.version,
        description: parsed.data.description ?? "",
        priority: parsed.data.priority,
        status: parsed.data.status,
        created_at: now,
        updated_at: now,
      })
      .run();

    const created = db.select().from(skills).where(eq(skills.id, id)).get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/skills error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

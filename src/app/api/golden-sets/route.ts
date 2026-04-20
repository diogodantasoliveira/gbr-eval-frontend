import { NextResponse } from "next/server";
import { db } from "@/db";
import { golden_sets, golden_set_cases, skills } from "@/db/schema";
import { eq, sql, and, SQL } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createGoldenSetSchema } from "@/lib/validations/golden-set";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const skill_id = searchParams.get("skill_id");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (skill_id) conditions.push(eq(golden_sets.skill_id, skill_id));
    if (status) conditions.push(eq(golden_sets.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(golden_sets)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const result = db
      .select({
        id: golden_sets.id,
        name: golden_sets.name,
        description: golden_sets.description,
        status: golden_sets.status,
        skill_id: golden_sets.skill_id,
        created_by: golden_sets.created_by,
        created_at: golden_sets.created_at,
        updated_at: golden_sets.updated_at,
        version: golden_sets.version,
        skill_name: skills.name,
        skill_doc_type: skills.doc_type,
        case_count: sql<number>`count(${golden_set_cases.id})`.as("case_count"),
      })
      .from(golden_sets)
      .leftJoin(skills, eq(golden_sets.skill_id, skills.id))
      .leftJoin(golden_set_cases, eq(golden_set_cases.golden_set_id, golden_sets.id))
      .where(whereClause)
      .groupBy(golden_sets.id)
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: result, total });
  } catch (err) {
    console.error("GET /api/golden-sets error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createGoldenSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { skill_id, name, description } = parsed.data;

    const skill = db.select().from(skills).where(eq(skills.id, skill_id)).get();
    if (!skill) {
      return NextResponse.json({ error: "skill_id not found" }, { status: 422 });
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(golden_sets).values({
      id,
      skill_id,
      name,
      description: description ?? "",
      status: "draft",
      created_by: "system",
      created_at: now,
      updated_at: now,
      version: 1,
    }).run();

    const created = db.select().from(golden_sets).where(eq(golden_sets.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/golden-sets error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

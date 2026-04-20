import { NextResponse } from "next/server";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq, and, sql, SQL } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createContractSchema } from "@/lib/validations/contract";
import { toJson } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const service_name = searchParams.get("service_name");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (service_name) conditions.push(eq(contracts.service_name, service_name));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select()
      .from(contracts)
      .where(whereClause)
      .orderBy(contracts.created_at)
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: rows, total });
  } catch (err) {
    console.error("GET /api/contracts error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createContractSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(contracts)
      .values({
        id,
        service_name: parsed.data.service_name,
        endpoint: parsed.data.endpoint,
        method: parsed.data.method,
        schema_snapshot: toJson(parsed.data.schema_snapshot),
        version: 1,
        source_commit: parsed.data.source_commit ?? "",
        status: "active",
        created_at: now,
        updated_at: now,
      })
      .run();

    const created = db.select().from(contracts).where(eq(contracts.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/contracts error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

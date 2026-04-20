import { NextResponse } from "next/server";
import { db } from "@/db";
import { eval_runs } from "@/db/schema";
import { and, desc, eq, sql, SQL } from "drizzle-orm";
import { importRunIntoDb } from "@/lib/runs/import-run";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const layer = url.searchParams.get("layer");
    const tier = url.searchParams.get("tier");
    const gate_result = url.searchParams.get("gate_result");
    const source = url.searchParams.get("source");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (layer) conditions.push(eq(eval_runs.layer, layer));
    if (tier) conditions.push(eq(eval_runs.tier, tier));
    if (gate_result) conditions.push(eq(eval_runs.gate_result, gate_result));
    if (source) conditions.push(eq(eval_runs.source, source));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(eval_runs)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select()
      .from(eval_runs)
      .where(whereClause)
      .orderBy(desc(eval_runs.imported_at))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: rows, total });
  } catch (err) {
    console.error("GET /api/runs error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const run = await importRunIntoDb(body, "import");

    const created = db.select().from(eval_runs).where(eq(eval_runs.id, run.id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("DUPLICATE:")) {
      return NextResponse.json({ error: err.message.slice(10) }, { status: 409 });
    }
    if (err instanceof Error && err.message.startsWith("VALIDATION:")) {
      return NextResponse.json({ error: "Validation failed", details: err.message.slice(11) }, { status: 400 });
    }
    console.error("POST /api/runs error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

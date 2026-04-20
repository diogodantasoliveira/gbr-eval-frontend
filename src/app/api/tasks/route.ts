import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_graders, task_inputs } from "@/db/schema";
import { eq, and, sql, SQL } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTaskSchema } from "@/lib/validations/task";
import { toJson } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const layer = searchParams.get("layer");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (category) conditions.push(eq(tasks.category, category));
    if (layer) conditions.push(eq(tasks.layer, layer));
    if (status) conditions.push(eq(tasks.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select()
      .from(tasks)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: rows, total });
  } catch (err) {
    console.error("GET /api/tasks error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check task_id uniqueness
    const existing = db
      .select()
      .from(tasks)
      .where(eq(tasks.task_id, parsed.data.task_id))
      .get();
    if (existing) {
      return NextResponse.json(
        { error: "task_id already exists" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(tasks)
      .values({
        id,
        task_id: parsed.data.task_id,
        category: parsed.data.category,
        component: parsed.data.component ?? "",
        layer: parsed.data.layer,
        tier: parsed.data.tier,
        tenant_profile: parsed.data.tenant_profile ?? "global",
        description: parsed.data.description ?? "",
        scoring_mode: parsed.data.scoring_mode,
        pass_threshold: parsed.data.pass_threshold,
        target_threshold: parsed.data.target_threshold ?? null,
        baseline_run_id: parsed.data.baseline_run_id ?? null,
        regression_signal: parsed.data.regression_signal ?? null,
        skill_id: parsed.data.skill_id ?? null,
        golden_set_id: parsed.data.golden_set_id ?? null,
        eval_checklist: toJson(parsed.data.eval_checklist ?? {}),
        eval_owner: parsed.data.eval_owner ?? null,
        eval_cadence: parsed.data.eval_cadence ?? null,
        golden_set_tags: parsed.data.golden_set_tags ? toJson(parsed.data.golden_set_tags) : null,
        epochs: parsed.data.epochs ?? 1,
        reducers: toJson(parsed.data.reducers ?? ["mean"]),
        primary_reducer: parsed.data.primary_reducer ?? "mean",
        status: parsed.data.status,
        created_at: now,
        updated_at: now,
      })
      .run();

    const created = db.select().from(tasks).where(eq(tasks.id, id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

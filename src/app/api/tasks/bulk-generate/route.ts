import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_inputs, golden_sets, golden_set_cases, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { toJson, safeJsonParse } from "@/lib/db";
import { redactRecord } from "@/lib/pii/redactor";
import { z } from "zod";

const bulkGenerateSchema = z.object({
  golden_set_id: z.string().min(1),
  category: z.string().default("extraction"),
  layer: z.string().default("product"),
  tier: z.string().default("gate"),
  pass_threshold: z.number().min(0).max(1).default(0.95),
  component: z.string().default("ai-engine"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bulkGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { golden_set_id, category, layer, tier, pass_threshold, component } =
      parsed.data;

    const goldenSet = db
      .select()
      .from(golden_sets)
      .where(eq(golden_sets.id, golden_set_id))
      .get();
    if (!goldenSet) {
      return NextResponse.json(
        { error: "golden_set_id not found" },
        { status: 422 }
      );
    }

    const skill = goldenSet.skill_id
      ? db.select().from(skills).where(eq(skills.id, goldenSet.skill_id)).get()
      : null;

    const cases = db
      .select()
      .from(golden_set_cases)
      .where(eq(golden_set_cases.golden_set_id, golden_set_id))
      .orderBy(golden_set_cases.case_number)
      .all();

    if (cases.length === 0) {
      return NextResponse.json(
        { error: "Golden set has no cases" },
        { status: 422 }
      );
    }

    const created: Array<{ task_id: string; id: string; case_number: number }> = [];
    const skipped: Array<{ task_id: string; reason: string }> = [];
    const now = Date.now();

    const docType = skill?.doc_type ?? "document";

    for (const c of cases) {
      const taskIdSlug = `${category}.${docType}.case_${c.case_number}`;

      // Skip if already exists
      const existing = db
        .select()
        .from(tasks)
        .where(eq(tasks.task_id, taskIdSlug))
        .get();
      if (existing) {
        skipped.push({ task_id: taskIdSlug, reason: "already exists" });
        continue;
      }

      const id = uuidv4();

      db.transaction((tx) => {
        tx.insert(tasks)
          .values({
            id,
            task_id: taskIdSlug,
            category,
            component,
            layer,
            tier,
            tenant_profile: "global",
            description: `Auto-generated from golden set "${goldenSet.name}" case #${c.case_number}`,
            scoring_mode: "weighted",
            pass_threshold,
            target_threshold: null,
            baseline_run_id: null,
            regression_signal: null,
            skill_id: goldenSet.skill_id ?? null,
            golden_set_id,
            eval_checklist: toJson({}),
            status: "draft",
            created_at: now,
            updated_at: now,
          })
          .run();

        // Create input record from case input_data (redacted)
        const parsedInput = safeJsonParse<Record<string, unknown>>(c.input_data ?? "{}", {});
        const redactedInput = redactRecord(parsedInput);
        tx.insert(task_inputs)
          .values({
            id: uuidv4(),
            task_id: id,
            endpoint: null,
            payload: JSON.stringify(redactedInput),
            fixture_path: c.document_path && !c.document_path.includes("..") && !c.document_path.startsWith("/") ? c.document_path : null,
          })
          .run();
      });

      created.push({ task_id: taskIdSlug, id, case_number: c.case_number });
    }

    return NextResponse.json(
      {
        generated: created.length,
        skipped_count: skipped.length,
        created,
        skipped,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/tasks/bulk-generate error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { convention_rules, tasks, task_graders, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { toJson } from "@/lib/db";
import { z } from "zod";
import { isValidId } from "@/lib/validations/params";

const generateSchema = z.object({
  repo: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, "Invalid repo name"),
  scan_target: z.string().max(200).default("**/*.py"),
  eval_owner: z.string().max(100).optional().default(""),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const rule = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.id, id))
      .get();

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { repo } = parsed.data;
    const repoSlug = repo.replace(/-/g, "_");
    const safeName = rule.name
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "_")
      .replace(/_+/g, "_");
    const taskId = `eng.${repoSlug}.${safeName}`;

    // Check if task already exists
    const existing = db
      .select()
      .from(tasks)
      .where(eq(tasks.task_id, taskId))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "Task already exists", task_id: taskId, id: existing.id },
        { status: 409 }
      );
    }

    // Determine grader type
    const isForbidden =
      rule.name.includes("no_") ||
      rule.name.includes("forbidden") ||
      rule.name.includes("not_");

    let graderType: string;
    let graderConfig: Record<string, unknown>;
    let graderRequired = true;

    if (rule.detection_type === "regex" && rule.detection_pattern) {
      graderType = isForbidden ? "pattern_forbidden" : "pattern_required";
      graderConfig = {
        pattern: rule.detection_pattern,
        file_key: "content",
      };
    } else if (rule.detection_type === "llm_judge") {
      graderType = "llm_judge";
      graderConfig = {
        rubric_id: "pending",
        model: "claude-sonnet-4-5-20250514",
      };
      graderRequired = false;
    } else {
      graderType = "pattern_required";
      graderConfig = { pattern: "", file_key: "content" };
      graderRequired = false;
    }

    const taskStatus = graderType === "llm_judge" ? "draft" : "active";

    const now = Date.now();
    const newTaskId = uuidv4();
    const graderId = uuidv4();

    db.transaction((tx) => {
      tx.insert(tasks)
        .values({
          id: newTaskId,
          task_id: taskId,
          category: "convention",
          component: repo,
          layer: "engineering",
          tier: "gate",
          tenant_profile: "global",
          description: rule.description || rule.name,
          scoring_mode: "binary",
          pass_threshold: 1.0,
          eval_checklist: toJson({}),
          eval_owner: parsed.data.eval_owner || null,
          eval_cadence: "per-pr",
          epochs: 1,
          reducers: toJson(["mean"]),
          primary_reducer: "mean",
          status: taskStatus,
          created_at: now,
          updated_at: now,
        })
        .run();

      tx.insert(task_graders)
        .values({
          id: graderId,
          task_id: newTaskId,
          grader_type: graderType,
          field: safeName,
          weight: 1.0,
          required: graderRequired ? 1 : 0,
          config: toJson(graderConfig),
          sort_order: 0,
        })
        .run();

      tx.insert(task_inputs)
        .values({
          id: uuidv4(),
          task_id: newTaskId,
          endpoint: null,
          payload: toJson({ repo, scan_target: parsed.data.scan_target }),
          fixture_path: null,
        })
        .run();
    });

    return NextResponse.json(
      { id: newTaskId, task_id: taskId, grader_type: graderType, status: "created" },
      { status: 201 }
    );
  } catch (err) {
    console.error(
      "POST /api/conventions/[id]/generate-task error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

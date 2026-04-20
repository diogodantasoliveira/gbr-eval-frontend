import { NextResponse } from "next/server";
import { db } from "@/db";
import { convention_rules, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rules = db.select().from(convention_rules).all();
    const allTasks = db
      .select({
        id: tasks.id,
        task_id: tasks.task_id,
        category: tasks.category,
      })
      .from(tasks)
      .where(eq(tasks.category, "convention"))
      .all();

    // Build coverage: for each rule, find tasks whose task_id contains the rule name
    const coverage: Array<{ rule_id: string; task_id: string }> = [];

    for (const rule of rules) {
      for (const task of allTasks) {
        if (task.task_id.includes(rule.name)) {
          coverage.push({ rule_id: rule.id, task_id: task.task_id });
        }
      }
    }

    return NextResponse.json({ rules, tasks: allTasks, coverage });
  } catch (err) {
    console.error("GET /api/conventions/coverage error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

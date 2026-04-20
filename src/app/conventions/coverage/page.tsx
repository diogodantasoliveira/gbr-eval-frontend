import Link from "next/link";
import { db } from "@/db";
import { convention_rules, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { CoverageMatrix } from "@/components/conventions/coverage-matrix";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
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

  // Build coverage entries
  const coverage: Array<{ rule_id: string; task_id: string }> = [];
  for (const rule of rules) {
    for (const task of allTasks) {
      if (task.task_id.includes(rule.name)) {
        coverage.push({ rule_id: rule.id, task_id: task.task_id });
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Coverage Matrix"
        description="Which convention rules have associated eval tasks"
      >
        <Button variant="outline" render={<Link href="/conventions" />}>
          <ArrowLeft className="size-4" />
          Back to Rules
        </Button>
      </PageHeader>

      <CoverageMatrix rules={rules} tasks={allTasks} coverage={coverage} />
    </div>
  );
}

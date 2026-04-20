import Link from "next/link";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/tasks/task-list";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const rows = db
    .select({
      id: tasks.id,
      task_id: tasks.task_id,
      category: tasks.category,
      layer: tasks.layer,
      tier: tasks.tier,
      status: tasks.status,
      pass_threshold: tasks.pass_threshold,
      description: tasks.description,
      updated_at: tasks.updated_at,
    })
    .from(tasks)
    .orderBy(tasks.created_at)
    .all();

  return (
    <div>
      <PageHeader title="Tasks" description="Eval task definitions">
        <Button render={<Link href="/tasks/new" />}>
          <Plus className="size-4" />
          New Task
        </Button>
      </PageHeader>
      <TaskList initialData={rows} />
    </div>
  );
}

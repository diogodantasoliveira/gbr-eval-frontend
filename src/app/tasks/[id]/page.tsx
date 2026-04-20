import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { tasks, task_graders, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TaskDetailView } from "@/components/tasks/task-detail";
import { safeJsonParse } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) notFound();

  const graders = db
    .select()
    .from(task_graders)
    .where(eq(task_graders.task_id, id))
    .orderBy(task_graders.sort_order)
    .all();

  const input = db
    .select()
    .from(task_inputs)
    .where(eq(task_inputs.task_id, id))
    .get();

  const taskDetail = {
    ...task,
    eval_checklist: safeJsonParse(task.eval_checklist ?? "{}", {}),
    graders: graders.map((g) => ({
      ...g,
      config: safeJsonParse(g.config ?? "{}", {}),
      required: g.required === 1,
    })),
    input: input
      ? {
          ...input,
          payload: safeJsonParse(input.payload ?? "{}", {}),
        }
      : null,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={task.task_id} description={task.description ?? task.category}>
        <Button variant="outline" render={<Link href={`/tasks/${id}/edit`} />}>
          Edit Task
        </Button>
        <Button variant="outline" render={<Link href="/tasks" />}>
          Back to Tasks
        </Button>
      </PageHeader>

      <TaskDetailView task={taskDetail} />
    </div>
  );
}

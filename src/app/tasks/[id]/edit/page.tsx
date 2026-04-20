import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { tasks, task_graders, task_inputs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { TaskWizard } from "@/components/tasks/task-wizard";
import { safeJsonParse } from "@/lib/db";
import type { EvalChecklist } from "@/lib/validations/task";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({
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

  const checklist = safeJsonParse<Partial<EvalChecklist>>(
    task.eval_checklist ?? "{}",
    {}
  );

  const initialTask = {
    id,
    task_id: task.task_id,
    category: task.category,
    component: task.component ?? "",
    layer: task.layer,
    tier: task.tier,
    description: task.description ?? "",
    scoring_mode: task.scoring_mode,
    pass_threshold: String(task.pass_threshold),
    target_threshold: task.target_threshold != null ? String(task.target_threshold) : "",
    tenant_profile: task.tenant_profile,
    skill_id: task.skill_id ?? "",
    golden_set_id: task.golden_set_id ?? "",
    status: task.status,
    checklist,
    endpoint: input?.endpoint ?? "",
    payload: input?.payload ? input.payload : "{}",
    fixture_path: input?.fixture_path ?? "",
    epochs: String(task.epochs ?? 1),
    reducers: safeJsonParse<string[]>(task.reducers ?? '["mean"]', ["mean"]),
    primary_reducer: task.primary_reducer ?? "mean",
    eval_owner: task.eval_owner ?? "",
    eval_cadence: task.eval_cadence ?? "",
    golden_set_tags: safeJsonParse<string[]>(task.golden_set_tags ?? "[]", []).join(", "),
    graders: graders.map((g) => ({
      id: g.id,
      grader_type: g.grader_type as import("@/lib/validations/task").GraderType,
      field: g.field ?? "",
      weight: g.weight,
      required: g.required === 1,
      config: safeJsonParse(g.config ?? "{}", {}),
      model_role: g.model_role ?? "",
      sort_order: g.sort_order,
    })),
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${task.task_id}`} description="Update task configuration">
        <Button variant="outline" render={<Link href={`/tasks/${id}`} />}>
          Cancel
        </Button>
      </PageHeader>

      <TaskWizard mode="edit" initialTask={initialTask} />
    </div>
  );
}

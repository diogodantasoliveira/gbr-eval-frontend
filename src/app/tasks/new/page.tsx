import { PageHeader } from "@/components/layout/header";
import { TaskWizard } from "@/components/tasks/task-wizard";

export default function NewTaskPage() {
  return (
    <div>
      <PageHeader
        title="New Task"
        description="Create a new eval task using the EVAL First wizard"
        breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: "New Task" }]}
      />
      <TaskWizard mode="create" />
    </div>
  );
}

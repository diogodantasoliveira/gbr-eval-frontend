import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { convention_rules, tasks } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatternEditor } from "@/components/conventions/pattern-editor";
import { GenerateTaskButton } from "@/components/conventions/generate-task-button";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

function severityColor(s: string): string {
  if (s === "critical") return "text-red-600 dark:text-red-400";
  if (s === "high") return "text-orange-600 dark:text-orange-400";
  if (s === "medium") return "text-yellow-600 dark:text-yellow-500";
  return "text-green-600 dark:text-green-400";
}

function detectionVariant(d: string): "default" | "outline" | "secondary" {
  if (d === "regex") return "default";
  if (d === "ast") return "secondary";
  return "outline";
}

export default async function ConventionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rule = db
    .select()
    .from(convention_rules)
    .where(eq(convention_rules.id, id))
    .get();

  if (!rule) notFound();

  const safeName = rule.name.replace(/[%_]/g, "\\$&");
  const linkedTasks = db
    .select({
      id: tasks.id,
      task_id: tasks.task_id,
      category: tasks.category,
      layer: tasks.layer,
      status: tasks.status,
    })
    .from(tasks)
    .where(like(tasks.task_id, `%${safeName}%`))
    .all();

  return (
    <div className="space-y-8">
      <PageHeader title={rule.name} description={rule.description ?? undefined} breadcrumbs={[{ label: "Conventions", href: "/conventions" }, { label: rule.name }]}>
        <Button
          variant="outline"
          render={<Link href={`/conventions/${id}/edit`} />}
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </PageHeader>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-lg text-sm">
        <div className="text-muted-foreground">Category</div>
        <div>
          <Badge variant="outline">{rule.category}</Badge>
        </div>

        <div className="text-muted-foreground">Severity</div>
        <div className={`font-medium ${severityColor(rule.severity)}`}>
          {rule.severity}
        </div>

        <div className="text-muted-foreground">Detection Type</div>
        <div>
          <Badge variant={detectionVariant(rule.detection_type)}>
            {rule.detection_type}
          </Badge>
        </div>

        <div className="text-muted-foreground">Status</div>
        <div>
          <Badge variant={rule.status === "active" ? "default" : "outline"}>
            {rule.status}
          </Badge>
        </div>

        {rule.source && (
          <>
            <div className="text-muted-foreground">Source</div>
            <div className="text-foreground">{rule.source}</div>
          </>
        )}
      </div>

      {/* Detection pattern */}
      {rule.detection_type === "regex" && rule.detection_pattern && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Detection Pattern</h2>
          <pre className="rounded-md border border-border bg-muted px-4 py-3 font-mono text-xs text-foreground overflow-x-auto">
            {rule.detection_pattern}
          </pre>
        </div>
      )}

      {/* Pattern examples */}
      <PatternEditor
        positiveExample={rule.positive_example ?? ""}
        negativeExample={rule.negative_example ?? ""}
        readOnly
      />

      {/* Linked tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Linked Tasks</h2>
          {linkedTasks.length === 0 && (
            <GenerateTaskButton ruleId={id} ruleName={rule.name} />
          )}
        </div>

        {linkedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks linked yet. Go to the coverage matrix to generate one.
          </p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {linkedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="font-mono text-xs text-foreground flex-1">
                  {t.task_id}
                </span>
                <Badge variant="secondary" className="text-xs">{t.layer}</Badge>
                <Badge
                  variant={t.status === "active" ? "default" : "outline"}
                  className="text-xs"
                >
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

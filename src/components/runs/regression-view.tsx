import { cn } from "@/lib/utils";

interface TaskResult {
  task_id: string;
  passed: boolean;
  score: number;
  regression_status: string | null;
  severity: string | null;
}

interface RegressionViewProps {
  taskResults: TaskResult[];
}

interface Section {
  key: string;
  label: string;
  className: string;
  headerClass: string;
  tasks: TaskResult[];
}

function scoreBar(score: number, colorClass: string) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", colorClass)}
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums">{(score * 100).toFixed(1)}%</span>
    </div>
  );
}

export function RegressionView({ taskResults }: RegressionViewProps) {
  const newlyFailing = taskResults.filter((t) => t.regression_status === "new_failure");
  const newlyPassing = taskResults.filter((t) => t.regression_status === "new_pass");
  const stablePass = taskResults.filter((t) => t.regression_status === "stable_pass");
  const stableFail = taskResults.filter((t) => t.regression_status === "stable_fail");
  const unclassified = taskResults.filter((t) => !t.regression_status);

  const sections: Section[] = [
    {
      key: "new_failure",
      label: `Newly Failing (${newlyFailing.length})`,
      className: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20",
      headerClass: "text-red-700 dark:text-red-400",
      tasks: newlyFailing,
    },
    {
      key: "new_pass",
      label: `Newly Passing (${newlyPassing.length})`,
      className: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20",
      headerClass: "text-green-700 dark:text-green-400",
      tasks: newlyPassing,
    },
    {
      key: "stable_pass",
      label: `Stable Pass (${stablePass.length})`,
      className: "border-border bg-muted/30",
      headerClass: "text-muted-foreground",
      tasks: stablePass,
    },
    {
      key: "stable_fail",
      label: `Stable Fail (${stableFail.length})`,
      className: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20",
      headerClass: "text-amber-700 dark:text-amber-400",
      tasks: stableFail,
    },
  ];

  if (unclassified.length > 0) {
    sections.push({
      key: "unclassified",
      label: `Unclassified (${unclassified.length})`,
      className: "border-border bg-card",
      headerClass: "text-muted-foreground",
      tasks: unclassified,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <div
          key={section.key}
          className={cn("rounded-xl border p-4", section.className)}
        >
          <h3 className={cn("text-sm font-semibold mb-3", section.headerClass)}>
            {section.label}
          </h3>
          {section.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">None</p>
          ) : (
            <ul className="space-y-2">
              {section.tasks.map((t) => (
                <li key={t.task_id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-foreground truncate" title={t.task_id}>
                    {t.task_id}
                  </span>
                  {scoreBar(
                    t.score,
                    t.score >= 0.9
                      ? "bg-green-500"
                      : t.score >= 0.7
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

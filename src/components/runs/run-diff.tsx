import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TaskSide {
  passed: boolean;
  score: number;
  severity: string | null;
  regression_status: string | null;
  duration_ms: number | null;
}

interface TaskComparison {
  task_id: string;
  a: TaskSide | null;
  b: TaskSide | null;
  score_delta: number | null;
  status_changed: boolean | null;
  change: "improved" | "regressed" | "unchanged" | "added" | "removed";
}

interface RunInfo {
  run_id: string;
  layer: string;
  overall_score: number;
  gate_result: string | null;
}

interface RunDiffProps {
  runA: RunInfo;
  runB: RunInfo;
  tasks: TaskComparison[];
  summary: {
    improved: number;
    regressed: number;
    unchanged: number;
    added: number;
    removed: number;
  };
}

function scoreCell(side: TaskSide | null) {
  if (!side) return <span className="text-muted-foreground text-xs italic">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "font-mono text-xs font-semibold",
          side.passed
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {(side.score * 100).toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">
        {side.passed ? "✓" : "✗"}
      </span>
    </div>
  );
}

function changeColor(change: TaskComparison["change"]) {
  switch (change) {
    case "improved": return "border-l-2 border-green-500";
    case "regressed": return "border-l-2 border-red-500";
    case "added": return "border-l-2 border-blue-500";
    case "removed": return "border-l-2 border-orange-500";
    default: return "";
  }
}

function deltaBadge(delta: number | null) {
  if (delta === null) return null;
  const pct = (delta * 100).toFixed(1);
  if (Math.abs(delta) < 0.01) return null;
  return (
    <span
      className={cn(
        "font-mono text-[10px] font-semibold",
        delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {delta > 0 ? "+" : ""}{pct}%
    </span>
  );
}

export function RunDiff({ runA, runB, tasks, summary }: RunDiffProps) {
  const changed = tasks.filter((t) => t.change !== "unchanged");
  const unchanged = tasks.filter((t) => t.change === "unchanged");

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 px-3 py-2 text-center min-w-16">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{summary.improved}</p>
          <p className="text-[10px] text-muted-foreground">Improved</p>
        </div>
        <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 px-3 py-2 text-center min-w-16">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{summary.regressed}</p>
          <p className="text-[10px] text-muted-foreground">Regressed</p>
        </div>
        <div className="rounded-lg border bg-muted px-3 py-2 text-center min-w-16">
          <p className="text-lg font-bold text-foreground">{summary.unchanged}</p>
          <p className="text-[10px] text-muted-foreground">Unchanged</p>
        </div>
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 px-3 py-2 text-center min-w-16">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.added}</p>
          <p className="text-[10px] text-muted-foreground">Added</p>
        </div>
        <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 px-3 py-2 text-center min-w-16">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{summary.removed}</p>
          <p className="text-[10px] text-muted-foreground">Removed</p>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
        <span className="font-mono truncate">{runA.run_id}</span>
        <span className="text-center w-24">Task</span>
        <span className="font-mono truncate text-right">{runB.run_id}</span>
      </div>

      {/* Changed tasks */}
      {changed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Changed</p>
          {changed.map((t) => (
            <div
              key={t.task_id}
              className={cn(
                "grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md px-2 py-1.5 pl-3 bg-card border",
                changeColor(t.change)
              )}
            >
              <div>{scoreCell(t.a)}</div>
              <div className="w-24 text-center">
                <p className="font-mono text-[10px] text-muted-foreground truncate" title={t.task_id}>
                  {t.task_id.split(".").slice(-2).join(".")}
                </p>
                {deltaBadge(t.score_delta)}
              </div>
              <div className="flex justify-end">{scoreCell(t.b)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Unchanged tasks (collapsed) */}
      {unchanged.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            {unchanged.length} unchanged tasks
          </summary>
          <div className="mt-2 space-y-1">
            {unchanged.map((t) => (
              <div
                key={t.task_id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md px-2 py-1 bg-muted/30 border border-transparent"
              >
                <div>{scoreCell(t.a)}</div>
                <div className="w-24 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground truncate" title={t.task_id}>
                    {t.task_id.split(".").slice(-2).join(".")}
                  </p>
                </div>
                <div className="flex justify-end">{scoreCell(t.b)}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GraderResult {
  grader_type: string;
  field?: string;
  passed: boolean;
  score: number;
  weight?: number;
  required?: boolean;
  details?: string;
}

interface TaskResult {
  id: string;
  task_id: string;
  passed: boolean;
  score: number;
  severity: string | null;
  regression_status: string | null;
  duration_ms: number | null;
  error: string | null;
  grader_results: GraderResult[];
  reducer_scores?: Record<string, number>;
  epoch_scores?: number[];
}

interface RunDetailProps {
  taskResults: TaskResult[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function severityClass(severity: string | null): string {
  switch (severity) {
    case "critical": return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    case "high": return "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800";
    case "medium": return "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
    case "low": return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
    default: return "text-muted-foreground bg-muted border-border";
  }
}

function regressionBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
    new_failure: { label: "New Failure", variant: "destructive" },
    new_pass: { label: "New Pass", variant: "default" },
    stable_pass: { label: "Stable Pass", variant: "outline" },
    stable_fail: { label: "Stable Fail", variant: "secondary" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.9
      ? "bg-green-500"
      : score >= 0.7
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden shrink-0">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

function GraderTable({ graders }: { graders: GraderResult[] }) {
  if (graders.length === 0) return <p className="text-xs text-muted-foreground italic">No grader results.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Grader</TableHead>
          <TableHead>Field</TableHead>
          <TableHead>Passed</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Required</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {graders.map((g, i) => (
          <TableRow key={i}>
            <TableCell className="font-mono text-xs">{g.grader_type}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{g.field ?? "—"}</TableCell>
            <TableCell>
              {g.passed ? (
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="size-4 text-red-600 dark:text-red-400" />
              )}
            </TableCell>
            <TableCell>
              <span className="font-mono text-xs">{(g.score * 100).toFixed(1)}%</span>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{g.weight ?? 1}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{g.required ? "Yes" : "No"}</TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{g.details ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TaskRow({ task }: { task: TaskResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell>
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">{task.task_id}</TableCell>
        <TableCell>
          {task.passed ? (
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="size-4 text-red-600 dark:text-red-400" />
          )}
        </TableCell>
        <TableCell>
          <ScoreBar score={task.score} />
        </TableCell>
        <TableCell>{regressionBadge(task.regression_status)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {task.duration_ms != null ? `${task.duration_ms.toFixed(0)}ms` : "—"}
        </TableCell>
        <TableCell className="text-xs text-destructive max-w-[160px] truncate">
          {task.error ?? ""}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/20 p-3 space-y-3">
            {task.epoch_scores && task.epoch_scores.length > 1 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-medium text-muted-foreground">Epoch scores:</span>
                {task.epoch_scores.map((s, i) => (
                  <span key={i} className="font-mono tabular-nums">
                    E{i + 1}: {(s * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            )}
            {task.reducer_scores && Object.keys(task.reducer_scores).length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-medium text-muted-foreground">Reducers:</span>
                {Object.entries(task.reducer_scores).map(([name, val]) => (
                  <span key={name} className="font-mono tabular-nums">
                    {name}: {(val * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            )}
            <GraderTable graders={task.grader_results} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function RunDetail({ taskResults }: RunDetailProps) {
  // Group by severity
  const bySeverity: Record<string, TaskResult[]> = {};
  for (const tr of taskResults) {
    const sev = tr.severity ?? "low";
    if (!bySeverity[sev]) bySeverity[sev] = [];
    bySeverity[sev].push(tr);
  }

  const severities = Object.keys(bySeverity).sort(
    (a, b) => (SEVERITY_ORDER[a] ?? 99) - (SEVERITY_ORDER[b] ?? 99)
  );

  if (taskResults.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No task results.</p>
    );
  }

  return (
    <div className="space-y-6">
      {severities.map((sev) => (
        <div key={sev} className={cn("rounded-xl border p-0 overflow-hidden", severityClass(sev))}>
          <div className={cn("px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b", severityClass(sev))}>
            {sev} ({bySeverity[sev].length})
          </div>
          <div className="bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6" />
                  <TableHead>Task ID</TableHead>
                  <TableHead className="w-12">Pass</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Regression</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySeverity[sev].map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

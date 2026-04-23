"use client";

import { AlertTriangle, FileCode2, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  error?: string | null;
  severity?: string | null;
  file_path?: string | null;
}

interface TaskResult {
  id: string;
  task_id: string;
  passed: boolean;
  score: number;
  severity: string | null;
  grader_results: GraderResult[];
}

interface EngineeringFindingsProps {
  taskResults: TaskResult[];
}

interface Finding {
  taskId: string;
  score: number;
  passed: boolean;
  details: string;
  severity: string;
  filePath: string | null;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function severityBadgeVariant(s: string): "default" | "outline" | "secondary" | "destructive" {
  if (s === "critical") return "destructive";
  if (s === "high") return "destructive";
  if (s === "medium") return "secondary";
  return "outline";
}

export function EngineeringFindings({ taskResults }: EngineeringFindingsProps) {
  const findings: Finding[] = [];

  for (const tr of taskResults) {
    for (const g of tr.grader_results) {
      if (g.grader_type !== "engineering_judge") continue;
      findings.push({
        taskId: tr.task_id,
        score: g.score,
        passed: g.passed,
        details: g.details ?? "",
        severity: g.severity ?? tr.severity ?? "medium",
        filePath: g.file_path ?? null,
      });
    }
  }

  if (findings.length === 0) return null;

  findings.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99) ||
      a.score - b.score
  );

  const avgScore = findings.reduce((s, f) => s + f.score, 0) / findings.length;
  const failCount = findings.filter((f) => !f.passed).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-500" />
            Engineering Findings ({findings.length})
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              Avg: {(avgScore * 100).toFixed(1)}%
            </span>
            {failCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {failCount} failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.map((f, i) => (
          <div
            key={`${f.taskId}-${i}`}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-sm",
              f.passed
                ? "border-border bg-card"
                : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {f.passed ? (
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-medium">{f.taskId}</span>
                <Badge variant={severityBadgeVariant(f.severity)} className="text-xs">
                  {f.severity}
                </Badge>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {(f.score * 100).toFixed(1)}%
                </span>
              </div>
              {f.filePath && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileCode2 className="size-3" />
                  <span className="font-mono truncate">{f.filePath}</span>
                </div>
              )}
              {f.details && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {f.details}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

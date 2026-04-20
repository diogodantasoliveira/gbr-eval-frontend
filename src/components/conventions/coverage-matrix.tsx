"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CoverageRule {
  id: string;
  name: string;
  category: string;
  severity: string;
}

interface CoverageTask {
  id: string;
  task_id: string;
  category: string;
}

interface CoverageEntry {
  rule_id: string;
  task_id: string;
}

interface CoverageMatrixProps {
  rules: CoverageRule[];
  tasks: CoverageTask[];
  coverage: CoverageEntry[];
}

// Group rules by category
function groupByCategory(rules: CoverageRule[]): Record<string, CoverageRule[]> {
  return rules.reduce<Record<string, CoverageRule[]>>((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {});
}

function severityColor(s: string): string {
  if (s === "critical") return "text-red-600 dark:text-red-400";
  if (s === "high") return "text-orange-600 dark:text-orange-400";
  if (s === "medium") return "text-yellow-600 dark:text-yellow-500";
  return "text-green-600 dark:text-green-400";
}

export function CoverageMatrix({ rules, tasks, coverage }: CoverageMatrixProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generateTarget, setGenerateTarget] = useState<CoverageRule | null>(null);
  const [component, setComponent] = useState("");
  const [localCoverage, setLocalCoverage] = useState<CoverageEntry[]>(coverage);

  const coveredRuleIds = new Set(localCoverage.map((c) => c.rule_id));
  const covered = rules.filter((r) => coveredRuleIds.has(r.id)).length;
  const total = rules.length;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

  function getTaskForRule(ruleId: string): CoverageTask | undefined {
    const entry = localCoverage.find((c) => c.rule_id === ruleId);
    if (!entry) return undefined;
    return tasks.find((t) => t.task_id === entry.task_id);
  }

  async function handleGenerate() {
    if (!generateTarget || !component.trim()) return;
    setGenerating(generateTarget.id);
    try {
      const res = await fetch(`/api/conventions/${generateTarget.id}/generate-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ component: component.trim(), layer: "engineering" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate task");
        return;
      }
      toast.success(`Task "${data.task_id}" created`);
      setLocalCoverage((prev) => [
        ...prev,
        { rule_id: generateTarget.id, task_id: data.task_id },
      ]);
      setGenerateTarget(null);
      setComponent("");
    } catch {
      toast.error("Network error");
    } finally {
      setGenerating(null);
    }
  }

  const grouped = groupByCategory(rules);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {covered} of {total} rules covered
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Matrix grouped by category */}
      {Object.entries(grouped).map(([category, categoryRules]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {category}
          </h3>
          <div className="rounded-md border border-border divide-y divide-border">
            {categoryRules.map((rule) => {
              const task = getTaskForRule(rule.id);
              const hasCoverage = !!task;
              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  {hasCoverage ? (
                    <CheckCircle2 className="size-4 shrink-0 text-green-500 dark:text-green-400" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-muted-foreground/50" />
                  )}

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/conventions/${rule.id}`}
                      className="font-mono text-xs font-medium hover:underline text-foreground"
                    >
                      {rule.name}
                    </Link>
                  </div>

                  <span className={`text-xs font-medium shrink-0 ${severityColor(rule.severity)}`}>
                    {rule.severity}
                  </span>

                  {hasCoverage ? (
                    <Link
                      href={`/tasks`}
                      className="text-xs font-mono text-muted-foreground hover:underline shrink-0"
                    >
                      {task.task_id}
                    </Link>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setGenerateTarget(rule)}
                      disabled={generating === rule.id}
                      className="shrink-0"
                    >
                      <Zap className="size-3" />
                      Generate
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Generate task dialog */}
      <Dialog open={!!generateTarget} onOpenChange={() => { setGenerateTarget(null); setComponent(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate an engineering eval task for convention rule{" "}
              <span className="font-mono text-foreground font-medium">
                {generateTarget?.name}
              </span>
              .
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="component">Component</Label>
              <Input
                id="component"
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                placeholder="e.g. frontend, bff, api-gateway"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The system component this convention applies to.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setGenerateTarget(null); setComponent(""); }}
              disabled={!!generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!component.trim() || !!generating}
            >
              {generating ? "Generating..." : "Generate Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

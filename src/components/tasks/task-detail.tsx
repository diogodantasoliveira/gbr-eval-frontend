"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { YamlPreview } from "./yaml-preview";
import { EVAL_CHECKLIST_QUESTIONS, type EvalChecklist } from "@/lib/validations/task";

interface GraderItem {
  id: string;
  grader_type: string;
  field: string | null;
  weight: number;
  required: boolean;
  config: Record<string, unknown>;
  sort_order: number;
}

interface TaskInput {
  id: string;
  endpoint: string | null;
  payload: Record<string, unknown>;
  fixture_path: string | null;
}

export interface TaskDetail {
  id: string;
  task_id: string;
  category: string;
  component: string;
  layer: string;
  tier: string;
  tenant_profile: string;
  description: string | null;
  scoring_mode: string;
  pass_threshold: number;
  target_threshold: number | null;
  baseline_run_id: string | null;
  regression_signal: string | null;
  skill_id: string | null;
  golden_set_id: string | null;
  eval_checklist: Partial<EvalChecklist>;
  status: string;
  created_at: number;
  updated_at: number;
  graders: GraderItem[];
  input: TaskInput | null;
}

interface TaskDetailProps {
  task: TaskDetail;
}

function statusVariant(s: string): "default" | "outline" | "secondary" {
  if (s === "active") return "default";
  if (s === "draft") return "secondary";
  return "outline";
}

export function TaskDetailView({ task }: TaskDetailProps) {
  const hasChecklist = Object.keys(task.eval_checklist).length > 0;

  // Build export preview object
  const exportPreview = {
    task_id: task.task_id,
    category: task.category,
    component: task.component || undefined,
    layer: task.layer,
    tier: task.tier,
    pass_threshold: task.pass_threshold,
    input: task.input
      ? { payload: task.input.payload, fixture_path: task.input.fixture_path }
      : undefined,
    graders: task.graders.map((g) => ({
      type: g.grader_type,
      field: g.field ?? undefined,
      weight: g.weight,
      required: g.required || undefined,
      ...g.config,
    })),
  };

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="mt-0.5">
                <Badge variant="outline">{task.category}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Layer</dt>
              <dd className="mt-0.5">
                <Badge variant="secondary">{task.layer}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tier</dt>
              <dd className="mt-0.5">
                <Badge variant="outline">{task.tier}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Scoring Mode</dt>
              <dd className="mt-0.5 text-foreground">{task.scoring_mode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pass Threshold</dt>
              <dd className="mt-0.5 tabular-nums">
                {(task.pass_threshold * 100).toFixed(0)}%
              </dd>
            </div>
            {task.target_threshold != null && (
              <div>
                <dt className="text-muted-foreground">Target Threshold</dt>
                <dd className="mt-0.5 tabular-nums">
                  {(task.target_threshold * 100).toFixed(0)}%
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Component</dt>
              <dd className="mt-0.5 font-mono text-xs">{task.component || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tenant Profile</dt>
              <dd className="mt-0.5">{task.tenant_profile}</dd>
            </div>
            {task.description && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="mt-0.5 text-foreground">{task.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-0.5 text-xs tabular-nums">
                {new Date(task.created_at).toLocaleString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="mt-0.5 text-xs tabular-nums">
                {new Date(task.updated_at).toLocaleString("pt-BR")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* EVAL First Checklist */}
      {hasChecklist && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">EVAL First Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {EVAL_CHECKLIST_QUESTIONS.map(({ key, label }) => {
              const answer = task.eval_checklist[key];
              if (!answer) return null;
              return (
                <div key={key}>
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm text-foreground">{answer}</dd>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Input Config */}
      {task.input && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Input Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.input.endpoint && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Endpoint</p>
                <p className="font-mono text-xs text-foreground">{task.input.endpoint}</p>
              </div>
            )}
            {task.input.fixture_path && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fixture Path</p>
                <p className="font-mono text-xs text-foreground">{task.input.fixture_path}</p>
              </div>
            )}
            {Object.keys(task.input.payload).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Payload</p>
                <YamlPreview data={task.input.payload} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Graders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Graders ({task.graders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.graders.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No graders configured.</p>
          ) : (
            task.graders.map((g, idx) => (
              <div
                key={g.id}
                className="flex flex-wrap items-start gap-3 rounded-md border border-border px-3 py-2"
              >
                <span className="text-xs text-muted-foreground w-5 shrink-0 pt-0.5">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {g.grader_type}
                    </Badge>
                    {g.field && (
                      <span className="font-mono text-xs text-foreground">
                        field: {g.field}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      weight: {g.weight}
                    </span>
                    {g.required && (
                      <Badge variant="destructive" className="text-xs">
                        required
                      </Badge>
                    )}
                  </div>
                  {Object.keys(g.config).length > 0 && (
                    <p className="text-xs font-mono text-muted-foreground">
                      {JSON.stringify(g.config)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* YAML Preview */}
      <div>
        <h3 className="text-sm font-semibold mb-3">CLI Export Preview</h3>
        <YamlPreview data={exportPreview} />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { eval_runs, eval_task_results, eval_postmortems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { RunDetail } from "@/components/runs/run-detail";
import { RegressionView } from "@/components/runs/regression-view";
import { GateMatrix } from "@/components/runs/gate-matrix";
import { EngineeringFindings } from "@/components/runs/engineering-findings";

export const dynamic = "force-dynamic";

function gateColor(gate: string | null): string {
  if (gate === "go") return "text-green-600 dark:text-green-400";
  if (gate === "conditional_go") return "text-amber-600 dark:text-amber-400";
  if (gate === "no_go") return "text-red-600 dark:text-red-400";
  if (gate === "no_go_absolute") return "text-red-800 dark:text-red-300 font-semibold";
  return "text-muted-foreground";
}

function formatDuration(startMs: number, endMs: number | null): string {
  if (!endMs) return "—";
  const diffMs = endMs - startMs;
  const secs = Math.floor(diffMs / 1000);
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins > 0) return `${mins}m ${remSecs}s`;
  return `${secs}s`;
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const run = db.select().from(eval_runs).where(eq(eval_runs.id, id)).get();
  if (!run) notFound();

  const taskResults = db
    .select()
    .from(eval_task_results)
    .where(eq(eval_task_results.run_id, id))
    .all()
    .map((tr) => ({
      ...tr,
      passed: tr.passed === 1,
      grader_results: safeJsonParse<Array<{ grader_type: string; field?: string; passed: boolean; score: number; weight?: number; required?: boolean; details?: string; error?: string | null; severity?: string | null; file_path?: string | null }>>(tr.grader_results ?? "[]", []),
      reducer_scores: safeJsonParse<Record<string, number>>(tr.reducer_scores ?? "{}", {}),
      epoch_scores: safeJsonParse<number[]>(tr.epoch_scores ?? "[]", []),
    }));

  const postmortems = db
    .select()
    .from(eval_postmortems)
    .where(eq(eval_postmortems.run_id, id))
    .orderBy(desc(eval_postmortems.created_at))
    .all();

  const metadata = safeJsonParse<Record<string, unknown>>(run.metadata ?? "{}", {});
  const gitSha = typeof metadata["git_sha"] === "string" ? metadata["git_sha"] : null;
  const branch = typeof metadata["branch"] === "string" ? metadata["branch"] : null;

  const gateLabel = run.gate_result
    ? run.gate_result.replace(/_/g, " ").toUpperCase()
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={run.run_id}
        description={`${run.layer}${run.tier ? ` / ${run.tier}` : ""} — imported ${new Date(run.imported_at).toLocaleString()}`}
        breadcrumbs={[{ label: "Runs", href: "/runs" }, { label: run.run_id }]}
      >
        <Button variant="outline" render={<Link href={`/runs/compare?a=${id}`} />}>
          Compare
        </Button>
        <Button variant="outline" render={<Link href="/runs" />}>
          Back to Runs
        </Button>
      </PageHeader>

      {/* Metadata card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Run Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Overall Score</dt>
              <dd className="mt-0.5 font-mono font-bold text-lg">
                {(run.overall_score * 100).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gate Result</dt>
              <dd className={`mt-0.5 font-medium ${gateColor(run.gate_result)}`}>
                {gateLabel}
              </dd>
            </div>
            {(() => {
              const repo = typeof metadata["repo"] === "string" ? metadata["repo"] : null;
              return repo ? (
                <div>
                  <dt className="text-muted-foreground">Repository</dt>
                  <dd className="mt-0.5 font-mono text-xs">{repo}</dd>
                </div>
              ) : null;
            })()}
            {branch && (
              <div>
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="mt-0.5 font-mono text-xs">{branch}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Tasks</dt>
              <dd className="mt-0.5 text-xs">
                <span className="text-green-600 dark:text-green-400">{run.tasks_passed}✓</span>
                {" / "}
                <span className="text-red-600 dark:text-red-400">{run.tasks_failed}✗</span>
                {" / "}{run.tasks_total}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Started</dt>
              <dd className="mt-0.5 font-mono text-xs">{formatDateTime(run.started_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Finished</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {run.finished_at ? formatDateTime(run.finished_at) : <span className="text-amber-600 dark:text-amber-400">In progress</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="mt-0.5 font-mono text-xs">
                {formatDuration(run.started_at, run.finished_at ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Layer</dt>
              <dd className="mt-0.5">
                <Badge variant="outline">{run.layer}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tier</dt>
              <dd className="mt-0.5 text-xs text-muted-foreground">{run.tier ?? "—"}</dd>
            </div>
            {gitSha && (
              <div>
                <dt className="text-muted-foreground">Git SHA</dt>
                <dd className="mt-0.5 font-mono text-xs">{gitSha.slice(0, 8)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="mt-0.5 text-xs capitalize">{run.source}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regression">Regression</TabsTrigger>
          <TabsTrigger value="postmortem">
            Postmortem ({postmortems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4 space-y-6">
          <GateMatrix
            gateResult={run.gate_result}
            taskResults={taskResults}
          />
          {taskResults.some((tr) =>
            tr.grader_results.some((g) => g.grader_type === "engineering_judge")
          ) && <EngineeringFindings taskResults={taskResults} />}
          <RunDetail taskResults={taskResults} />
        </TabsContent>

        <TabsContent value="regression" className="pt-4">
          <RegressionView taskResults={taskResults} />
        </TabsContent>

        <TabsContent value="postmortem" className="pt-4">
          {postmortems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No postmortems yet.
            </p>
          ) : (
            <div className="space-y-4">
              {postmortems.map((pm) => (
                <Card key={pm.id}>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">
                      {pm.task_id ? (
                        <span className="font-mono">{pm.task_id}</span>
                      ) : (
                        "Run-level postmortem"
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      By {pm.created_by} — {new Date(pm.created_at).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      {[
                        { dt: "What happened", dd: pm.what },
                        { dt: "Root cause", dd: pm.root_cause },
                        { dt: "Impact", dd: pm.impact },
                        { dt: "Fix", dd: pm.fix },
                        { dt: "Prevention", dd: pm.prevention },
                      ].map(({ dt, dd }) => (
                        <div key={dt}>
                          <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dt}</dt>
                          <dd className="mt-0.5 text-foreground">{dd}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import Link from "next/link";
import {
  BookOpen,
  Database,
  ListChecks,
  BarChart3,
  FileJson,
  Shield,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertPanel } from "@/components/alerts/alert-panel";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format-date";
import { db } from "@/db";
import {
  skills,
  golden_sets,
  golden_set_cases,
  tasks,
  eval_runs,
  contracts,
  convention_rules,
} from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function gateVariant(gate: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (gate) {
    case "go": return "default";
    case "conditional_go": return "secondary";
    case "no_go": return "outline";
    case "no_go_absolute": return "outline";
    default: return "outline";
  }
}

function gateLabel(gate: string | null): string {
  switch (gate) {
    case "go": return "GO";
    case "conditional_go": return "CONDITIONAL";
    case "no_go": return "NO-GO";
    case "no_go_absolute": return "NO-GO (ABS)";
    default: return "—";
  }
}

export default async function DashboardPage() {
  // Summary counts
  const [skillCount] = db.select({ count: sql<number>`count(*)` }).from(skills).all();
  const [gsCount] = db.select({ count: sql<number>`count(*)` }).from(golden_sets).all();
  const [caseCount] = db.select({ count: sql<number>`count(*)` }).from(golden_set_cases).all();
  const [taskCount] = db.select({ count: sql<number>`count(*)` }).from(tasks).all();
  const [runCount] = db.select({ count: sql<number>`count(*)` }).from(eval_runs).all();
  const [contractCount] = db.select({ count: sql<number>`count(*)` }).from(contracts).all();
  const [ruleCount] = db.select({ count: sql<number>`count(*)` }).from(convention_rules).all();
  const [activeRules] = db
    .select({ count: sql<number>`count(*)` })
    .from(convention_rules)
    .where(eq(convention_rules.status, "active"))
    .all();

  // Latest run score
  const latestRun = db
    .select()
    .from(eval_runs)
    .orderBy(desc(eval_runs.imported_at))
    .limit(1)
    .get();

  // Recent 10 runs
  const recentRuns = db
    .select()
    .from(eval_runs)
    .orderBy(desc(eval_runs.imported_at))
    .limit(10)
    .all();

  const coveragePct =
    ruleCount.count > 0
      ? Math.round((activeRules.count / ruleCount.count) * 100)
      : 0;

  const summaryCards = [
    {
      title: "Skills",
      value: String(skillCount.count),
      description: "Active evaluation skills",
      icon: BookOpen,
      href: "/skills",
    },
    {
      title: "Golden Sets",
      value: `${gsCount.count} sets`,
      description: `${caseCount.count} annotated cases`,
      icon: Database,
      href: "/golden-sets",
    },
    {
      title: "Tasks",
      value: String(taskCount.count),
      description: "Evaluation task definitions",
      icon: ListChecks,
      href: "/tasks",
    },
    {
      title: "Eval Runs",
      value: String(runCount.count),
      description: latestRun
        ? `Latest: ${(latestRun.overall_score * 100).toFixed(1)}%`
        : "No runs yet",
      icon: BarChart3,
      href: "/runs",
    },
    {
      title: "Contracts",
      value: String(contractCount.count),
      description: "API schema snapshots",
      icon: FileJson,
      href: "/contracts",
    },
    {
      title: "Convention Rules",
      value: `${activeRules.count} active`,
      description: `${coveragePct}% coverage`,
      icon: Shield,
      href: "/conventions",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of the gbr-eval framework"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map(({ title, value, description, icon: Icon, href }) => (
          <Link key={title} href={href} className="group block">
            <Card className="transition-colors group-hover:border-ring/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{title}</CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Active Alerts</h2>
        </div>
        <AlertPanel />
      </div>

      {/* Recent runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Runs</h2>
          <Link
            href="/runs"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {recentRuns.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {run.tasks_failed === 0 ? (
                    <CheckCircle className="size-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{run.run_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.tasks_passed}/{run.tasks_total} passed &middot; layer {run.layer}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">
                    {(run.overall_score * 100).toFixed(1)}%
                  </span>
                  <Badge variant={gateVariant(run.gate_result)} className="text-xs">
                    {gateLabel(run.gate_result)}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {timeAgo(run.imported_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Score trend */}
      {recentRuns.length >= 2 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Score Trend</h2>
            <Link
              href="/runs"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              All runs <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-end gap-1" style={{ height: "80px" }}>
              {recentRuns.slice().reverse().map((run) => {
                const pct = Math.round(run.overall_score * 100);
                const h = Math.max(4, Math.round(run.overall_score * 72));
                const color = run.overall_score >= 0.9
                  ? "bg-green-500 dark:bg-green-400"
                  : run.overall_score >= 0.7
                  ? "bg-amber-500 dark:bg-amber-400"
                  : "bg-red-500 dark:bg-red-400";
                return (
                  <Link
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    style={{ height: "80px" }}
                    title={`${run.run_id}: ${pct}%`}
                  >
                    <div className={cn("w-full rounded-t transition-opacity group-hover:opacity-80", color)} style={{ height: `${h}px` }} />
                    <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-[50px]">
                      {timeAgo(run.imported_at)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

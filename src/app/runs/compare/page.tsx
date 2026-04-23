"use client";

import { Suspense, useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RunDiff } from "@/components/runs/run-diff";
import { PassFailBarChart } from "@/components/charts/pass-fail-bar-chart";
import { ScoreLineChart } from "@/components/charts/score-line-chart";
import { useSearchParams } from "next/navigation";

interface EvalRun {
  id: string;
  run_id: string;
  layer: string;
  overall_score: number;
  gate_result: string | null;
  started_at: number;
}

interface CompareResult {
  run_a: EvalRun;
  run_b: EvalRun;
  summary: {
    improved: number;
    regressed: number;
    unchanged: number;
    added: number;
    removed: number;
  };
  tasks: Array<{
    task_id: string;
    a: {
      passed: boolean;
      score: number;
      severity: string | null;
      regression_status: string | null;
      duration_ms: number | null;
    } | null;
    b: {
      passed: boolean;
      score: number;
      severity: string | null;
      regression_status: string | null;
      duration_ms: number | null;
    } | null;
    score_delta: number | null;
    status_changed: boolean | null;
    change: "improved" | "regressed" | "unchanged" | "added" | "removed";
  }>;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const preselectedA = searchParams.get("a") ?? "";

  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [runA, setRunA] = useState(preselectedA);
  const [runB, setRunB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((json) => setRuns(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => {});
  }, []);

  async function handleCompare() {
    if (!runA || !runB) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/runs/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id_a: runA, run_id_b: runB }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Compare failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Run A (baseline)</label>
          <Select value={runA} onValueChange={(v) => { if (v) setRunA(v); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select run A..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="font-mono text-xs">{r.run_id}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Run B (candidate)</label>
          <Select value={runB} onValueChange={(v) => { if (v) setRunB(v); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select run B..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="font-mono text-xs">{r.run_id}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCompare} disabled={!runA || !runB || loading || runA === runB}>
          {loading ? "Comparing..." : "Compare"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Score Comparison</p>
              <ScoreLineChart
                data={[
                  {
                    label: `A: ${result.run_a.run_id.slice(0, 8)}`,
                    score: result.run_a.overall_score,
                    run_id: result.run_a.run_id,
                  },
                  {
                    label: `B: ${result.run_b.run_id.slice(0, 8)}`,
                    score: result.run_b.overall_score,
                    run_id: result.run_b.run_id,
                  },
                ]}
                height={200}
              />
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Pass / Fail Breakdown</p>
              <PassFailBarChart
                data={[
                  {
                    label: `A: ${result.run_a.run_id.slice(0, 8)}`,
                    passed: result.tasks.filter((t) => t.a?.passed).length,
                    failed: result.tasks.filter((t) => t.a && !t.a.passed).length,
                    total: result.tasks.filter((t) => t.a).length,
                  },
                  {
                    label: `B: ${result.run_b.run_id.slice(0, 8)}`,
                    passed: result.tasks.filter((t) => t.b?.passed).length,
                    failed: result.tasks.filter((t) => t.b && !t.b.passed).length,
                    total: result.tasks.filter((t) => t.b).length,
                  },
                ]}
                height={200}
              />
            </div>
          </div>

          <RunDiff
            runA={result.run_a}
            runB={result.run_b}
            tasks={result.tasks}
            summary={result.summary}
          />
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare Runs"
        description="Side-by-side comparison of two eval runs"
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <CompareContent />
      </Suspense>
    </div>
  );
}

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
        <RunDiff
          runA={result.run_a}
          runB={result.run_b}
          tasks={result.tasks}
          summary={result.summary}
        />
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

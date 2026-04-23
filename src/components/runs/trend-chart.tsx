"use client";

import { AlertTriangle } from "lucide-react";
import { ScoreLineChart } from "@/components/charts/score-line-chart";
import type { ScorePoint } from "@/components/charts/score-line-chart";

interface TrendPoint {
  run_id: string;
  started_at: number;
  overall_score?: number;
  score?: number;
  gate_result?: string | null;
}

interface TrendChartProps {
  points: TrendPoint[];
  degradationAlert: boolean;
  maxConsecutiveDeclines: number;
  nThreshold: number;
  threshold?: number; // optional pass threshold line (0-1)
  label?: string;
}

function scoreValue(p: TrendPoint): number {
  return p.overall_score ?? p.score ?? 0;
}

export function TrendChart({
  points,
  degradationAlert,
  maxConsecutiveDeclines,
  nThreshold,
  threshold = 0.9,
  label = "Overall Score",
}: TrendChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No trend data available.</p>
    );
  }

  const chartData: ScorePoint[] = points.map((p) => ({
    label: new Date(p.started_at).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    score: scoreValue(p),
    run_id: p.run_id,
  }));

  return (
    <div className="space-y-3">
      {degradationAlert && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Degradation detected: {maxConsecutiveDeclines} consecutive declining runs (threshold:{" "}
            {nThreshold}).
          </span>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">{label}</p>
        <ScoreLineChart data={chartData} threshold={threshold} height={240} />
      </div>
    </div>
  );
}

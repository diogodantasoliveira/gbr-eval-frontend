"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

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

  const maxScore = 1;
  const chartHeight = 160;
  const barMaxH = chartHeight - 24; // leave room for labels

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

        {/* Chart area */}
        <div
          className="relative flex items-end gap-1"
          style={{ height: `${chartHeight}px` }}
          role="img"
          aria-label={`${label} trend chart`}
        >
          {/* Threshold line overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-amber-500/60"
            style={{ bottom: `${(threshold / maxScore) * barMaxH}px` }}
          >
            <span className="absolute right-0 -top-4 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              {(threshold * 100).toFixed(0)}%
            </span>
          </div>

          {/* Bars */}
          {points.map((p, i) => {
            const val = scoreValue(p);
            const barH = Math.max(4, Math.round((val / maxScore) * barMaxH));
            const isLast = i === points.length - 1;
            const prev = i > 0 ? scoreValue(points[i - 1]) : null;
            const declining = prev !== null && val < prev;
            const barColor = declining
              ? "bg-red-500 dark:bg-red-400"
              : val >= threshold
              ? "bg-green-500 dark:bg-green-400"
              : "bg-amber-500 dark:bg-amber-400";

            return (
              <div
                key={p.run_id}
                className="group relative flex flex-1 flex-col items-center justify-end"
                style={{ height: `${chartHeight}px` }}
              >
                <div
                  className={cn("w-full rounded-t transition-opacity", barColor)}
                  style={{ height: `${barH}px` }}
                />
                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-popover border text-xs px-2 py-1 shadow text-popover-foreground">
                  <p className="font-mono font-semibold">{(val * 100).toFixed(1)}%</p>
                  <p className="text-muted-foreground truncate max-w-[120px]">{p.run_id}</p>
                  <p className="text-muted-foreground">
                    {new Date(p.started_at).toLocaleDateString()}
                  </p>
                </div>
                {/* X-axis label for first / last / every 5th */}
                {(i === 0 || isLast || i % 5 === 0) && (
                  <span className="absolute -bottom-5 text-[9px] text-muted-foreground truncate max-w-[40px] text-center">
                    {new Date(p.started_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis spacer for labels */}
        <div style={{ height: "20px" }} />
      </div>
    </div>
  );
}

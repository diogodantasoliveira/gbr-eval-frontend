"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/header";
import { TrendChart } from "@/components/runs/trend-chart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface TrendPoint {
  run_id: string;
  run_db_id: string;
  started_at: number;
  overall_score?: number;
  score?: number;
  gate_result?: string | null;
  layer?: string;
}

interface TrendResult {
  task_id?: string;
  layer?: string;
  points: TrendPoint[];
  degradation_alert: boolean;
  max_consecutive_declines: number;
  n_threshold: number;
}

export default function TrendsPage() {
  const [mode, setMode] = useState<"layer" | "task">("layer");
  const [layer, setLayer] = useState("all");
  const [taskId, setTaskId] = useState("");
  const [result, setResult] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTrend() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (mode === "task" && taskId.trim()) {
        params.set("task_id", taskId.trim());
      } else if (mode === "layer" && layer !== "all") {
        params.set("layer", layer);
      }

      const res = await fetch(`/api/runs/trends?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load trends");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  // Load on mount
  useEffect(() => {
    loadTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartLabel =
    mode === "task" && taskId
      ? `Score trend: ${taskId}`
      : layer !== "all"
      ? `Overall score — ${layer}`
      : "Overall score — all layers";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Score Trends"
        description="Track score evolution across eval runs over time"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Mode</label>
          <Select value={mode} onValueChange={(v) => { if (v) setMode(v as "layer" | "task"); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="layer">By layer</SelectItem>
              <SelectItem value="task">By task</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "layer" ? (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Layer filter</label>
            <Select value={layer} onValueChange={(v) => { if (v) setLayer(v); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All layers</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Task ID</label>
            <Input
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="extraction.matricula.cpf"
              className="w-64 font-mono text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") loadTrend(); }}
            />
          </div>
        )}

        <Button onClick={loadTrend} disabled={loading}>
          {loading ? "Loading..." : "Load Trends"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <TrendChart
          points={result.points}
          degradationAlert={result.degradation_alert}
          maxConsecutiveDeclines={result.max_consecutive_declines}
          nThreshold={result.n_threshold}
          label={chartLabel}
        />
      )}

      {result && result.points.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No data points found for the selected filter.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, GitBranch, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";

interface Alert {
  id: string;
  type: "score_drop" | "regression" | "trend_decline";
  severity: "critical" | "high" | "medium";
  description: string;
  run_id: string;
  task_id?: string;
  timestamp: number;
}

function severityClass(severity: Alert["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30";
    case "high":
      return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30";
    case "medium":
      return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30";
  }
}

function severityBadgeVariant(severity: Alert["severity"]): "default" | "outline" | "secondary" {
  if (severity === "critical") return "default";
  if (severity === "high") return "secondary";
  return "outline";
}

function typeIcon(type: Alert["type"]) {
  switch (type) {
    case "score_drop":
      return <AlertTriangle className="size-4 shrink-0" />;
    case "regression":
      return <GitBranch className="size-4 shrink-0" />;
    case "trend_decline":
      return <TrendingDown className="size-4 shrink-0" />;
  }
}

function typeLabel(type: Alert["type"]): string {
  switch (type) {
    case "score_drop":
      return "Score Drop";
    case "regression":
      return "Regression";
    case "trend_decline":
      return "Trend Decline";
  }
}

export function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data: Alert[]) => {
        setAlerts(Array.isArray(data) ? data : []);
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-2">Loading alerts…</div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No active alerts — all evaluations within thresholds.
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-live="polite">
      {visible.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-md border px-4 py-3",
            severityClass(alert.severity)
          )}
        >
          <span className="mt-0.5 text-muted-foreground">{typeIcon(alert.type)}</span>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={severityBadgeVariant(alert.severity)} className="text-xs">
                {alert.severity}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {typeLabel(alert.type)}
              </span>
              <Link
                href={`/runs/${alert.run_id}`}
                className="text-xs font-mono text-primary hover:underline"
              >
                view run
              </Link>
            </div>
            <p className="text-sm text-foreground">{alert.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(alert.timestamp)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => dismiss(alert.id)}
            title="Dismiss"
            aria-label="Dismiss"
            className="shrink-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

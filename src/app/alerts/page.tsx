"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Alert {
  id: string;
  type: "score_drop" | "regression" | "trend_decline";
  severity: "critical" | "high" | "medium";
  description: string;
  run_id: string;
  task_id?: string;
  timestamp: number;
}

const SEVERITY_STYLES: Record<Alert["severity"], string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const TYPE_LABELS: Record<Alert["type"], string> = {
  score_drop: "Score Drop",
  regression: "Regression",
  trend_decline: "Trend Decline",
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const json = await res.json();
        setAlerts(Array.isArray(json) ? json : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Score drops, regressions, and trend declines from recent eval runs"
      >
        <Button variant="outline" onClick={loadAlerts} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-md border border-border p-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="size-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active alerts</p>
          <p className="text-xs text-muted-foreground mt-1">
            Alerts are computed from the last 30 days of eval runs
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(criticalCount > 0 || highCount > 0) && (
            <div className="flex gap-2 text-xs">
              {criticalCount > 0 && (
                <Badge variant="destructive">{criticalCount} critical</Badge>
              )}
              {highCount > 0 && (
                <Badge variant="outline" className="border-orange-400 text-orange-600 dark:text-orange-400">
                  {highCount} high
                </Badge>
              )}
              <span className="text-muted-foreground self-center">
                {alerts.length} total
              </span>
            </div>
          )}

          <div className="rounded-md border border-border divide-y divide-border">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3">
                <Badge
                  variant="secondary"
                  className={cn("shrink-0 text-xs", SEVERITY_STYLES[alert.severity])}
                >
                  {alert.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {TYPE_LABELS[alert.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{alert.description}</p>
                  <div className="flex gap-2 mt-1">
                    <Link
                      href={`/runs/${alert.run_id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View run
                    </Link>
                    {alert.task_id && (
                      <Link
                        href={`/tasks?q=${encodeURIComponent(alert.task_id)}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View task
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

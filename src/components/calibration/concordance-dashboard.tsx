"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { interpretKappa } from "@/lib/calibration/kappa";

interface ConcordanceDashboardProps {
  sessionId: string;
  status: string;
  cohensKappa: number | null;
  disagreementsCount: number;
  resolvedCount: number;
  annotationsCount: number;
}

function kappaColorClass(kappa: number): string {
  if (kappa >= 0.75) return "text-green-600 dark:text-green-400";
  if (kappa >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function kappaBarColor(kappa: number): string {
  if (kappa >= 0.75) return "bg-green-500";
  if (kappa >= 0.5) return "bg-amber-500";
  return "bg-red-500";
}

function kappaPercent(kappa: number): number {
  // Map -1..1 to 0..100 for bar width
  return Math.max(0, Math.min(100, ((kappa + 1) / 2) * 100));
}

const INTERPRETATION_GUIDE = [
  { range: "< 0", label: "Poor", color: "bg-red-500" },
  { range: "0 – 0.2", label: "Slight", color: "bg-red-400" },
  { range: "0.2 – 0.4", label: "Fair", color: "bg-orange-400" },
  { range: "0.4 – 0.6", label: "Moderate", color: "bg-amber-400" },
  { range: "0.6 – 0.8", label: "Substantial", color: "bg-lime-500" },
  { range: "0.8 – 1.0", label: "Almost Perfect", color: "bg-green-500" },
];

export function ConcordanceDashboard({
  sessionId,
  status,
  cohensKappa,
  disagreementsCount,
  resolvedCount,
  annotationsCount,
}: ConcordanceDashboardProps) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [perFieldKappa, setPerFieldKappa] = useState<Record<string, number> | null>(null);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/calibration/sessions/${sessionId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to complete session");
        return;
      }
      toast.success(`Session completed — κ = ${data.kappa.toFixed(3)}`);
      setPerFieldKappa(data.per_field ?? null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setCompleting(false);
    }
  }

  const resolutionPct =
    disagreementsCount > 0
      ? Math.round((resolvedCount / disagreementsCount) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Main kappa score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Overall Agreement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cohensKappa !== null ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-bold tabular-nums ${kappaColorClass(cohensKappa)}`}>
                  {cohensKappa.toFixed(3)}
                </span>
                <span className="text-sm text-muted-foreground capitalize">
                  κ — {interpretKappa(cohensKappa)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${kappaBarColor(cohensKappa)}`}
                  style={{ width: `${kappaPercent(cohensKappa)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kappa has not been computed yet. Complete the session to compute agreement.
              </p>
              {status === "in_progress" && (
                <Button onClick={handleComplete} disabled={completing}>
                  {completing ? "Computing..." : "Complete & Compute Kappa"}
                </Button>
              )}
            </div>
          )}

          <dl className="grid grid-cols-3 gap-4 pt-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Annotations</dt>
              <dd className="font-semibold">{annotationsCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Disagreements</dt>
              <dd className="font-semibold">{disagreementsCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resolved</dt>
              <dd className="font-semibold">
                {resolvedCount}{" "}
                <span className="text-muted-foreground font-normal">
                  ({resolutionPct}%)
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Per-field kappa bars */}
      {(cohensKappa !== null || perFieldKappa) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Per-Field Kappa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Recomputed after completing the session.
            </p>
            {perFieldKappa && Object.keys(perFieldKappa).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(perFieldKappa).map(([field, kappa]) => (
                  <div key={field} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{field}</span>
                      <span className={`font-semibold tabular-nums ${kappaColorClass(kappa)}`}>
                        {kappa.toFixed(3)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${kappaBarColor(kappa)}`}
                        style={{ width: `${kappaPercent(kappa)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Click "Complete &amp; Compute Kappa" to see per-field breakdown.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interpretation guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Interpretation Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {INTERPRETATION_GUIDE.map(({ range, label, color }) => (
              <div key={range} className="flex items-center gap-2 text-sm">
                <div className={`size-3 rounded-sm flex-none ${color}`} />
                <span className="font-mono text-xs text-muted-foreground w-20">{range}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DriftedContract {
  contract_id: string;
  service_name: string;
  endpoint: string;
  current_version: number;
  fields_added: string[];
  fields_removed: string[];
  fields_changed: string[];
}

interface DriftResult {
  checked: number;
  drifted: DriftedContract[];
}

export function DriftAlert() {
  const [result, setResult] = useState<DriftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function checkDrift() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts/check-drift", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const data: DriftResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check drift");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const hasDrift = result && result.drifted.length > 0;
  const allOk = result && result.drifted.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={checkDrift}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <AlertCircle className="size-3.5" />
          )}
          Check Drift
        </Button>

        {result && (
          <span className="text-sm text-muted-foreground">
            {result.checked} contract{result.checked !== 1 ? "s" : ""} checked
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {allOk && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle className="size-4 shrink-0" />
          All contracts match their latest version — no drift detected.
        </div>
      )}

      {hasDrift && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              {result.drifted.length} contract{result.drifted.length !== 1 ? "s" : ""} drifted from
              their previous snapshot.
            </span>
          </div>

          {result.drifted.map((c) => {
            const open = expanded.has(c.contract_id);
            return (
              <div
                key={c.contract_id}
                className="rounded-md border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                  onClick={() => toggleExpand(c.contract_id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm text-foreground truncate">
                      {c.service_name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {c.endpoint}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      v{c.current_version}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.fields_added.length > 0 && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        +{c.fields_added.length}
                      </Badge>
                    )}
                    {c.fields_removed.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        -{c.fields_removed.length}
                      </Badge>
                    )}
                    {c.fields_changed.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ~{c.fields_changed.length}
                      </Badge>
                    )}
                    {open ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-orange-200 dark:border-orange-800 px-4 py-3 space-y-3 text-xs">
                    {c.fields_added.length > 0 && (
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400 mb-1">
                          Added ({c.fields_added.length})
                        </p>
                        <ul className="space-y-0.5">
                          {c.fields_added.map((f) => (
                            <li key={f} className="font-mono text-muted-foreground">
                              + {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.fields_removed.length > 0 && (
                      <div>
                        <p className="font-semibold text-red-700 dark:text-red-400 mb-1">
                          Removed ({c.fields_removed.length})
                        </p>
                        <ul className="space-y-0.5">
                          {c.fields_removed.map((f) => (
                            <li key={f} className="font-mono text-muted-foreground">
                              - {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.fields_changed.length > 0 && (
                      <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                          Changed ({c.fields_changed.length})
                        </p>
                        <ul className="space-y-0.5">
                          {c.fields_changed.map((f) => (
                            <li key={f} className="font-mono text-muted-foreground">
                              ~ {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

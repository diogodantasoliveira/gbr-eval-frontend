"use client";

import { cn } from "@/lib/utils";

interface SchemaDiffProps {
  oldSchema: Record<string, unknown>;
  newSchema: Record<string, unknown>;
  oldVersion: number;
  newVersion: number;
  oldDate?: number;
  newDate?: number;
}

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface DiffEntry {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  status: DiffStatus;
}

function flattenSchema(
  schema: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties as Record<string, unknown> | undefined;

  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      const prop = v as Record<string, unknown>;
      result[fullKey] = prop.type ?? prop.$ref ?? "(unknown)";
      if (prop.properties) {
        Object.assign(result, flattenSchema(prop, fullKey));
      }
    }
  } else if (schema.type) {
    result[prefix || "(root)"] = schema.type;
  }

  return result;
}

function computeDiff(
  oldSchema: Record<string, unknown>,
  newSchema: Record<string, unknown>
): DiffEntry[] {
  const oldFlat = flattenSchema(oldSchema);
  const newFlat = flattenSchema(newSchema);
  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);

  const entries: DiffEntry[] = [];
  for (const key of Array.from(allKeys).sort()) {
    const inOld = key in oldFlat;
    const inNew = key in newFlat;
    const oldVal = oldFlat[key];
    const newVal = newFlat[key];

    let status: DiffStatus;
    if (!inOld) status = "added";
    else if (!inNew) status = "removed";
    else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) status = "changed";
    else status = "unchanged";

    entries.push({ key, oldValue: oldVal, newValue: newVal, status });
  }
  return entries;
}

function rowBg(status: DiffStatus, side: "left" | "right"): string {
  if (status === "added" && side === "right")
    return "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300";
  if (status === "added" && side === "left")
    return "bg-muted/20 text-muted-foreground/40";
  if (status === "removed" && side === "left")
    return "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300";
  if (status === "removed" && side === "right")
    return "bg-muted/20 text-muted-foreground/40";
  if (status === "changed")
    return "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300";
  return "";
}

function formatValue(v: unknown): string {
  if (v === undefined) return "—";
  return String(v);
}

function formatDate(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SchemaDiff({
  oldSchema,
  newSchema,
  oldVersion,
  newVersion,
  oldDate,
  newDate,
}: SchemaDiffProps) {
  const diffs = computeDiff(oldSchema, newSchema);
  const hasChanges = diffs.some((d) => d.status !== "unchanged");

  return (
    <div className="rounded-md border border-border overflow-hidden text-xs font-mono">
      {/* Header */}
      <div className="grid grid-cols-2 border-b border-border">
        <div className="px-3 py-2 bg-muted/40 border-r border-border">
          <span className="font-semibold text-muted-foreground">
            v{oldVersion}
          </span>
          {oldDate && (
            <span className="ml-2 text-muted-foreground/60">{formatDate(oldDate)}</span>
          )}
        </div>
        <div className="px-3 py-2 bg-muted/40">
          <span className="font-semibold text-muted-foreground">
            v{newVersion}
          </span>
          {newDate && (
            <span className="ml-2 text-muted-foreground/60">{formatDate(newDate)}</span>
          )}
        </div>
      </div>

      {!hasChanges ? (
        <div className="px-3 py-6 text-center text-muted-foreground text-xs font-sans">
          No differences between these versions.
        </div>
      ) : (
        <div>
          {diffs.map((entry) => (
            <div
              key={entry.key}
              className={cn(
                "grid grid-cols-2 border-b border-border/50 last:border-0",
                entry.status === "unchanged" && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "px-3 py-1.5 border-r border-border/50",
                  rowBg(entry.status, "left")
                )}
              >
                <span className="text-foreground/70">{entry.key}</span>
                {entry.status !== "added" && (
                  <span className="ml-2 text-current/80">
                    {formatValue(entry.oldValue)}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "px-3 py-1.5",
                  rowBg(entry.status, "right")
                )}
              >
                <span className="text-foreground/70">{entry.key}</span>
                {entry.status !== "removed" && (
                  <span className="ml-2 text-current/80">
                    {formatValue(entry.newValue)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-border bg-muted/20 font-sans">
        <span className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <span className="inline-block size-2.5 rounded-sm bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700" />
          Added
        </span>
        <span className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
          <span className="inline-block size-2.5 rounded-sm bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700" />
          Removed
        </span>
        <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <span className="inline-block size-2.5 rounded-sm bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700" />
          Changed type
        </span>
      </div>
    </div>
  );
}

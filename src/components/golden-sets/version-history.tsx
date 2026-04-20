"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Version {
  id: string;
  version: number;
  changed_by: string;
  changed_at: number;
  change_reason: string | null;
  expected_output: Record<string, unknown>;
}

interface VersionHistoryProps {
  versions: Version[];
}

function diffKeys(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): { added: string[]; removed: string[]; changed: string[] } {
  const aKeys = new Set(Object.keys(a));
  const bKeys = new Set(Object.keys(b));
  const added = [...bKeys].filter((k) => !aKeys.has(k));
  const removed = [...aKeys].filter((k) => !bKeys.has(k));
  const changed = [...aKeys].filter(
    (k) => bKeys.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])
  );
  return { added, removed, changed };
}

function VersionEntry({
  version,
  nextVersion,
}: {
  version: Version;
  nextVersion?: Version;
}) {
  const [open, setOpen] = useState(false);

  const diff = nextVersion
    ? diffKeys(version.expected_output, nextVersion.expected_output)
    : null;

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-3 size-3 rounded-full border-2 border-border bg-background" />
      {/* Timeline line */}
      <div className="absolute left-[5px] top-6 bottom-0 w-px bg-border" />

      <div className="rounded-md border border-border p-3 space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
            <span className="text-sm font-medium">v{version.version}</span>
            <span className="text-xs text-muted-foreground">
              by {version.changed_by || "system"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {new Date(version.changed_at).toLocaleString("pt-BR")}
          </div>
        </button>

        {version.change_reason && (
          <p className="text-xs text-muted-foreground pl-5 italic">{version.change_reason}</p>
        )}

        {diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pl-5">
            {diff.added.map((k) => (
              <span key={k} className="text-[10px] rounded px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                + {k}
              </span>
            ))}
            {diff.removed.map((k) => (
              <span key={k} className="text-[10px] rounded px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                - {k}
              </span>
            ))}
            {diff.changed.map((k) => (
              <span key={k} className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                ~ {k}
              </span>
            ))}
          </div>
        )}

        {open && (
          <div className="pl-5">
            <pre className="text-xs overflow-auto rounded bg-muted p-3 max-h-[400px] text-foreground">
              {JSON.stringify(version.expected_output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function VersionHistory({ versions }: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No version history yet. History is created when expected_output is modified.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((v, idx) => (
        <VersionEntry
          key={v.id}
          version={v}
          nextVersion={versions[idx + 1]}
        />
      ))}
    </div>
  );
}

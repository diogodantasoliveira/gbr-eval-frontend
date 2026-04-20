"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GitCompare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchemaViewer } from "./schema-viewer";
import { SchemaDiff } from "./schema-diff";
import { cn } from "@/lib/utils";

export interface ContractVersion {
  id: string;
  contract_id: string;
  version: number;
  schema_snapshot: Record<string, unknown>;
  diff_from_previous: unknown;
  imported_at: number;
  imported_by: string;
}

interface ContractVersionHistoryProps {
  contractId: string;
  currentVersion: number;
  currentSchema: Record<string, unknown>;
  initialVersions: ContractVersion[];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContractVersionHistory({
  contractId,
  currentVersion,
  currentSchema,
  initialVersions,
}: ContractVersionHistoryProps) {
  const [versions] = useState<ContractVersion[]>(initialVersions);
  const [viewingVersion, setViewingVersion] = useState<ContractVersion | null>(null);
  const [comparingVersion, setComparingVersion] = useState<ContractVersion | null>(null);
  const [mode, setMode] = useState<"view" | "diff" | null>(null);

  function handleView(v: ContractVersion) {
    setViewingVersion(v);
    setComparingVersion(null);
    setMode("view");
  }

  function handleCompare(v: ContractVersion) {
    setComparingVersion(v);
    setViewingVersion(null);
    setMode("diff");
  }

  function handleClose() {
    setViewingVersion(null);
    setComparingVersion(null);
    setMode(null);
  }

  if (versions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No version history yet. Previous snapshots will appear here after edits.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="space-y-1">
        {/* Current version entry */}
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xs font-semibold text-foreground">
              v{currentVersion}
            </span>
            <span className="text-[10px] text-primary font-medium">current</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Active version</span>
          </div>
        </div>

        {/* Historical versions */}
        {versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors",
              (viewingVersion?.id === v.id || comparingVersion?.id === v.id)
                ? "bg-accent border-ring"
                : "hover:bg-muted/30"
            )}
          >
            <div className="flex flex-col items-center gap-0.5 w-8 shrink-0">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                v{v.version}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground">{formatDate(v.imported_at)}</div>
              <div className="text-[10px] text-muted-foreground">
                by {v.imported_by}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                title="View schema at this version"
                onClick={() => handleView(v)}
              >
                <Eye className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Compare with current"
                onClick={() => handleCompare(v)}
              >
                <GitCompare className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {mode === "view" && viewingVersion && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Schema at v{viewingVersion.version}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
          <SchemaViewer schema={viewingVersion.schema_snapshot} />
        </div>
      )}

      {mode === "diff" && comparingVersion && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Comparing v{comparingVersion.version} → v{currentVersion} (current)
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
          <SchemaDiff
            oldSchema={comparingVersion.schema_snapshot}
            newSchema={currentSchema}
            oldVersion={comparingVersion.version}
            newVersion={currentVersion}
            oldDate={comparingVersion.imported_at}
          />
        </div>
      )}
    </div>
  );
}

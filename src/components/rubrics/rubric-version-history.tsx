"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format-date";

interface RubricVersion {
  id: string;
  version: number;
  rubric_text: string;
  changed_by: string;
  changed_at: number;
  change_reason: string | null;
}

interface RubricVersionHistoryProps {
  versions: RubricVersion[];
  currentVersion: number;
}

export function RubricVersionHistory({ versions, currentVersion }: RubricVersionHistoryProps) {
  const [viewing, setViewing] = useState<RubricVersion | null>(null);

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No previous versions. Version history is created when rubric text changes.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Current version marker */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="size-3 rounded-full bg-primary" />
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">v{currentVersion}</span>
              <Badge variant="default" className="text-xs">Current</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Active version</p>
          </div>
        </div>

        {versions.map((v, idx) => (
          <div key={v.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="size-3 rounded-full bg-muted-foreground/40 mt-0.5" />
              {idx < versions.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            <Card size="sm" className="flex-1 mb-3">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">v{v.version}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewing(v)}
                  >
                    View text
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-24 shrink-0">Changed at</dt>
                    <dd className="font-mono">{formatDateTime(v.changed_at)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-24 shrink-0">Changed by</dt>
                    <dd>{v.changed_by}</dd>
                  </div>
                  {v.change_reason && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">Reason</dt>
                      <dd>{v.change_reason}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rubric Text — v{viewing?.version}</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="max-h-[60vh] overflow-y-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap text-foreground bg-muted rounded-lg p-4">
              {viewing?.rubric_text || "(empty)"}
            </pre>
          </div>
          <div className="text-xs text-muted-foreground">
            Saved {viewing ? formatDateTime(viewing.changed_at) : ""} by {viewing?.changed_by}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

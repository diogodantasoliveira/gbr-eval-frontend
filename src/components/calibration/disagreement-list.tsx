"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2 as CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Disagreement {
  id: string;
  session_id: string;
  case_id: string;
  field_name: string;
  annotator_1_value: string;
  annotator_2_value: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: number | null;
  case_number: number | null;
}

interface DisagreementListProps {
  sessionId: string;
  disagreements: Disagreement[];
}

export function DisagreementList({ sessionId, disagreements }: DisagreementListProps) {
  const router = useRouter();
  const [resolveTarget, setResolveTarget] = useState<Disagreement | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolvedBy, setResolvedBy] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    if (!resolveTarget || !resolution.trim() || !resolvedBy.trim()) {
      toast.error("Resolution and resolved-by are required");
      return;
    }
    setResolving(true);
    try {
      const res = await fetch(`/api/calibration/sessions/${sessionId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disagreement_id: resolveTarget.id,
          resolution: resolution.trim(),
          resolved_by: resolvedBy.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to resolve disagreement");
        return;
      }
      toast.success("Disagreement resolved");
      setResolveTarget(null);
      setResolution("");
      setResolvedBy("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setResolving(false);
    }
  }

  if (disagreements.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2Icon}
        title="No disagreements"
        description="All annotations are in agreement."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case #</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Annotator 1</TableHead>
            <TableHead>Annotator 2</TableHead>
            <TableHead>Resolution</TableHead>
            <TableHead>Resolved By</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disagreements.map((d) => {
            const isUnresolved = !d.resolution;
            return (
              <TableRow
                key={d.id}
                className={isUnresolved ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}
              >
                <TableCell className="font-mono text-sm">
                  #{d.case_number ?? "?"}
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">
                  {d.field_name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                  {d.annotator_1_value || <span className="italic">empty</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                  {d.annotator_2_value || <span className="italic">empty</span>}
                </TableCell>
                <TableCell className="text-sm max-w-[160px] truncate">
                  {d.resolution ?? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                      Unresolved
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.resolved_by ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {isUnresolved && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setResolveTarget(d);
                        setResolution("");
                        setResolvedBy("");
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!resolveTarget} onOpenChange={() => setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Disagreement</DialogTitle>
          </DialogHeader>

          {resolveTarget && (
            <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Field:</span>{" "}
                <span className="font-mono font-medium">{resolveTarget.field_name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Annotator 1:</span>{" "}
                {resolveTarget.annotator_1_value || <span className="italic">empty</span>}
              </p>
              <p>
                <span className="text-muted-foreground">Annotator 2:</span>{" "}
                {resolveTarget.annotator_2_value || <span className="italic">empty</span>}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resolution">Resolution (correct value)</Label>
              <Input
                id="resolution"
                placeholder="Enter the correct value..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resolved-by">Resolved By</Label>
              <Input
                id="resolved-by"
                placeholder="e.g. supervisor@example.com"
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveTarget(null)}
              disabled={resolving}
            >
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolving}>
              {resolving ? "Saving..." : "Save Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Eye } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Session {
  id: string;
  skill_id: string;
  golden_set_id: string;
  annotator_1: string;
  annotator_2: string;
  status: string;
  cohens_kappa: number | null;
  started_at: number;
  completed_at: number | null;
  skill_name: string | null;
  golden_set_name: string | null;
}

interface SessionListProps {
  sessions: Session[];
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
  return "outline";
}

function kappaColor(kappa: number): string {
  if (kappa >= 0.75) return "text-green-600 dark:text-green-400";
  if (kappa >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function SessionList({ sessions }: SessionListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calibration/sessions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete session");
        return;
      }
      toast.success("Session deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No calibration sessions found.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Golden Set</TableHead>
            <TableHead>Annotator 1</TableHead>
            <TableHead>Annotator 2</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Kappa</TableHead>
            <TableHead>Started</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="font-medium">
                {session.skill_name ?? session.skill_id}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {session.golden_set_name ?? session.golden_set_id}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {session.annotator_1}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {session.annotator_2}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(session.status)}>
                  {session.status === "in_progress" ? "In Progress" : "Completed"}
                </Badge>
              </TableCell>
              <TableCell>
                {session.cohens_kappa !== null ? (
                  <span className={`font-mono text-sm font-semibold ${kappaColor(session.cohens_kappa)}`}>
                    {session.cohens_kappa.toFixed(3)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {new Date(session.started_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/calibration/sessions/${session.id}`} />}
                  >
                    <Eye className="size-3.5" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(session)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this calibration session? All annotations
            and disagreements will also be deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

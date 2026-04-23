"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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

interface Rubric {
  id: string;
  name: string;
  category: string;
  status: string;
  promotion_status: string;
  model: string;
  version: number;
}

interface RubricListProps {
  rubrics: Rubric[];
}

function statusVariant(status: string): "default" | "outline" | "secondary" {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  return "outline";
}

function promotionVariant(ps: string): "default" | "outline" | "secondary" {
  if (ps === "blocking") return "default";
  return "outline";
}

export function RubricList({ rubrics }: RubricListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Rubric | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rubrics/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete rubric");
        return;
      }
      toast.success(`Rubric "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (rubrics.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No rubrics found"
        description="Create a rubric to get started."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Promotion</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rubrics.map((rubric) => (
            <TableRow key={rubric.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/rubrics/${rubric.id}`}
                  className="hover:underline text-foreground"
                >
                  {rubric.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {rubric.category}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(rubric.status)}>
                  {rubric.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={promotionVariant(rubric.promotion_status)}>
                  {rubric.promotion_status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {rubric.model}
              </TableCell>
              <TableCell className="text-muted-foreground">
                v{rubric.version}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/rubrics/${rubric.id}`} />}
                  >
                    <Eye className="size-3.5" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/rubrics/${rubric.id}/edit`} />}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(rubric)}
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
            <DialogTitle>Delete Rubric</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            ? This will also delete all criteria, examples, and version history.
            This action cannot be undone.
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

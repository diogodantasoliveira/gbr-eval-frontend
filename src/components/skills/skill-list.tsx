"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Eye } from "lucide-react";
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

interface Skill {
  id: string;
  name: string;
  doc_type: string;
  version: string;
  priority: string;
  status: string;
  field_count: number;
}

interface SkillListProps {
  skills: Skill[];
}

function priorityVariant(
  priority: string
): "destructive" | "default" | "secondary" | "outline" {
  if (priority === "P0") return "destructive";
  if (priority === "P1") return "default";
  if (priority === "P2") return "secondary";
  return "outline";
}

function priorityClass(priority: string): string {
  if (priority === "P0") return "";
  if (priority === "P1") return "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400";
  if (priority === "P2") return "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400";
  return "";
}

export function SkillList({ skills }: SkillListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const data = await res.json();
        toast.error(`Cannot delete: ${data.error}`);
        return;
      }
      if (!res.ok) {
        toast.error("Failed to delete skill");
        return;
      }
      toast.success(`Skill "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (skills.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No skills found.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Doc Type</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((skill) => (
            <TableRow key={skill.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/skills/${skill.id}`}
                  className="hover:underline text-foreground"
                >
                  {skill.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {skill.doc_type}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {skill.version}
              </TableCell>
              <TableCell>
                <Badge
                  variant={priorityVariant(skill.priority)}
                  className={priorityClass(skill.priority)}
                >
                  {skill.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={skill.status === "active" ? "default" : "outline"}
                >
                  {skill.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {skill.field_count}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/skills/${skill.id}`} />}
                  >
                    <Eye className="size-3.5" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/skills/${skill.id}/edit`} />}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(skill)}
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
            <DialogTitle>Delete Skill</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            ? This will also delete all its fields. This action cannot be
            undone.
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

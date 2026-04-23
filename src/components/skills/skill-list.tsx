"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, Search } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSortable } from "@/hooks/use-sortable";
import { SortableHead } from "@/components/ui/sortable-head";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const STATUSES = ["active", "draft", "deprecated"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];

const skillAccessors = {
  name: (s: Skill) => s.name,
  doc_type: (s: Skill) => s.doc_type,
  version: (s: Skill) => s.version,
  priority: (s: Skill) => s.priority,
  status: (s: Skill) => s.status,
} as const;

type SkillSortKey = keyof typeof skillAccessors;

export function SkillList({ skills }: SkillListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const searched = useMemo(() => {
    if (!search) return skills;
    const q = search.toLowerCase();
    return skills.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.doc_type.toLowerCase().includes(q)
    );
  }, [skills, search]);

  const filtered = searched.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
    return true;
  });

  const { sorted, sort, onSort } = useSortable<Skill, SkillSortKey>(filtered, skillAccessors);
  const { page, pageCount, paginatedItems, onPageChange } = usePagination(sorted);

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[200px]"
          />
        </div>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? "all")}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterStatus !== "all" || filterPriority !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterStatus("all"); setFilterPriority("all"); }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {skills.length} skills
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead active={sort?.key === "name"} direction={sort?.key === "name" ? sort.direction : null} onClick={() => onSort("name")}>Name</SortableHead>
            <SortableHead active={sort?.key === "doc_type"} direction={sort?.key === "doc_type" ? sort.direction : null} onClick={() => onSort("doc_type")}>Doc Type</SortableHead>
            <SortableHead active={sort?.key === "version"} direction={sort?.key === "version" ? sort.direction : null} onClick={() => onSort("version")}>Version</SortableHead>
            <SortableHead active={sort?.key === "priority"} direction={sort?.key === "priority" ? sort.direction : null} onClick={() => onSort("priority")}>Priority</SortableHead>
            <SortableHead active={sort?.key === "status"} direction={sort?.key === "status" ? sort.direction : null} onClick={() => onSort("status")}>Status</SortableHead>
            <TableHead>Fields</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.map((skill) => (
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
      <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />

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
    </div>
  );
}

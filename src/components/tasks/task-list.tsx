"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, Download } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

export interface TaskRow {
  id: string;
  task_id: string;
  category: string;
  layer: string;
  tier: string;
  status: string;
  pass_threshold: number;
  description: string | null;
  updated_at: number;
}

interface TaskListProps {
  initialData: TaskRow[];
}

const CATEGORIES = [
  "classification",
  "extraction",
  "decision",
  "citation",
  "cost",
  "latency",
  "code_quality",
  "tenant_isolation",
  "convention",
];

const LAYERS = ["engineering", "product", "operational", "compliance"];
const STATUSES = ["draft", "active", "deprecated"];

function statusVariant(s: string): "default" | "outline" | "secondary" {
  if (s === "active") return "default";
  if (s === "draft") return "secondary";
  return "outline";
}

function tierVariant(t: string): "default" | "outline" | "secondary" {
  if (t === "gate") return "default";
  if (t === "regression") return "secondary";
  return "outline";
}

export function TaskList({ initialData }: TaskListProps) {
  const router = useRouter();
  const [data, setData] = useState<TaskRow[]>(initialData);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLayer, setFilterLayer] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = data.filter((t) => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterLayer !== "all" && t.layer !== filterLayer) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const { page, pageCount, paginatedItems, onPageChange } = usePagination(filtered);

  async function handleDelete(id: string, taskId: string) {
    if (!confirm(`Delete task "${taskId}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLayer} onValueChange={(v) => setFilterLayer(v ?? "all")}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All layers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All layers</SelectItem>
            {LAYERS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {(filterCategory !== "all" || filterLayer !== "all" || filterStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCategory("all");
              setFilterLayer("all");
              setFilterStatus("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Layer</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Pass Threshold</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-10"
                >
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="font-mono text-xs font-medium hover:underline text-foreground"
                    >
                      {t.task_id}
                    </Link>
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {t.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {t.layer}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tierVariant(t.tier)} className="text-xs">
                      {t.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status)} className="text-xs">
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {(t.pass_threshold * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="View"
                        render={<Link href={`/tasks/${t.id}`} />}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        render={<Link href={`/tasks/${t.id}/edit`} />}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Export"
                        render={<a href={`/api/tasks/${t.id}/export`} download />}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete"
                        onClick={() => handleDelete(t.id, t.task_id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
    </div>
  );
}

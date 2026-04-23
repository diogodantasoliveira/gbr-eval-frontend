"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, Eye, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface EvalRun {
  id: string;
  run_id: string;
  layer: string;
  tier: string | null;
  tasks_total: number;
  tasks_passed: number;
  tasks_failed: number;
  overall_score: number;
  gate_result: string | null;
  source: string;
  started_at: number;
  imported_at: number;
}

interface RunListProps {
  runs: EvalRun[];
}

function gateVariant(gate: string | null): "default" | "outline" | "secondary" | "destructive" {
  if (!gate) return "outline";
  if (gate === "go") return "default";
  if (gate === "conditional_go") return "secondary";
  return "destructive";
}

function gateLabel(gate: string | null): string {
  if (!gate) return "—";
  return gate.replace(/_/g, " ").toUpperCase();
}

function gateColor(gate: string | null): string {
  if (gate === "go") return "text-green-600 dark:text-green-400";
  if (gate === "conditional_go") return "text-amber-600 dark:text-amber-400";
  if (gate === "no_go") return "text-red-600 dark:text-red-400";
  if (gate === "no_go_absolute") return "text-red-800 dark:text-red-300 font-semibold";
  return "text-muted-foreground";
}

function scoreColor(score: number): string {
  if (score >= 0.9) return "text-green-600 dark:text-green-400";
  if (score >= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const runAccessors = {
  run_id: (r: EvalRun) => r.run_id,
  overall_score: (r: EvalRun) => r.overall_score,
  tasks_passed: (r: EvalRun) => r.tasks_passed / (r.tasks_total || 1),
  imported_at: (r: EvalRun) => r.imported_at,
} as const;

type RunSortKey = keyof typeof runAccessors;

export function RunList({ runs }: RunListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<EvalRun | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLayer, setFilterLayer] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterGate, setFilterGate] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const layers = Array.from(new Set(runs.map((r) => r.layer)));
  const tiers = Array.from(new Set(runs.map((r) => r.tier).filter(Boolean) as string[]));
  const gates = Array.from(new Set(runs.map((r) => r.gate_result).filter(Boolean) as string[]));
  const sources = Array.from(new Set(runs.map((r) => r.source)));

  const searched = useMemo(() => {
    if (!search) return runs;
    const q = search.toLowerCase();
    return runs.filter((r) =>
      r.run_id.toLowerCase().includes(q) || r.source.toLowerCase().includes(q)
    );
  }, [runs, search]);

  const filtered = searched.filter((r) => {
    if (filterLayer !== "all" && r.layer !== filterLayer) return false;
    if (filterTier !== "all" && r.tier !== filterTier) return false;
    if (filterGate !== "all" && r.gate_result !== filterGate) return false;
    if (filterSource !== "all" && r.source !== filterSource) return false;
    return true;
  });

  const { sorted, sort, onSort } = useSortable<EvalRun, RunSortKey>(filtered, runAccessors);
  const { page, pageCount, paginatedItems, onPageChange } = usePagination(sorted);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/runs/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete run");
        return;
      }
      toast.success(`Run "${deleteTarget.run_id}" deleted`);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search runs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[200px]"
          />
        </div>
        <span className="text-xs text-muted-foreground self-center">{filtered.length} runs</span>
        <Select value={filterLayer} onValueChange={(v) => { if (v) setFilterLayer(v); }}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All layers</SelectItem>
            {layers.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTier} onValueChange={(v) => { if (v) setFilterTier(v); }}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {tiers.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterGate} onValueChange={(v) => { if (v) setFilterGate(v); }}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Gate result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All gates</SelectItem>
            {gates.map((g) => (
              <SelectItem key={g} value={g}>{gateLabel(g)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSource} onValueChange={(v) => { if (v) setFilterSource(v); }}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No runs found.
        </p>
      ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead active={sort?.key === "run_id"} direction={sort?.key === "run_id" ? sort.direction : null} onClick={() => onSort("run_id")}>Run ID</SortableHead>
              <TableHead>Layer</TableHead>
              <TableHead>Tier</TableHead>
              <SortableHead active={sort?.key === "overall_score"} direction={sort?.key === "overall_score" ? sort.direction : null} onClick={() => onSort("overall_score")}>Score</SortableHead>
              <TableHead>Gate</TableHead>
              <SortableHead active={sort?.key === "tasks_passed"} direction={sort?.key === "tasks_passed" ? sort.direction : null} onClick={() => onSort("tasks_passed")}>Tasks</SortableHead>
              <TableHead>Source</TableHead>
              <SortableHead active={sort?.key === "imported_at"} direction={sort?.key === "imported_at" ? sort.direction : null} onClick={() => onSort("imported_at")}>Date</SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/runs/${run.id}`}
                    className="hover:underline text-foreground font-medium"
                  >
                    {run.run_id}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{run.layer}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {run.tier ?? "—"}
                </TableCell>
                <TableCell>
                  <span className={`font-mono font-semibold ${scoreColor(run.overall_score)}`}>
                    {(run.overall_score * 100).toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${gateColor(run.gate_result)}`}>
                    {gateLabel(run.gate_result)}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <span className="text-green-600 dark:text-green-400">{run.tasks_passed}✓</span>
                  {" / "}
                  <span className="text-red-600 dark:text-red-400">{run.tasks_failed}✗</span>
                  {" / "}
                  {run.tasks_total}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">
                  {run.source}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(run.started_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<Link href={`/runs/${run.id}`} />}
                    >
                      <Eye className="size-3.5" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(run)}
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
        </>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Run</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete run{" "}
            <span className="font-mono font-medium text-foreground">
              {deleteTarget?.run_id}
            </span>
            ? This will also delete all task results and postmortems. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSortable } from "@/hooks/use-sortable";
import { SortableHead } from "@/components/ui/sortable-head";
import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "./case-status-badge";
import { Pencil, Trash2, Download, Search, Database } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { formatDate } from "@/lib/format-date";

interface GoldenSet {
  id: string;
  name: string;
  description: string | null;
  status: string;
  skill_id: string;
  skill_name: string | null;
  skill_doc_type: string | null;
  case_count: number;
  created_at: number;
}

interface Skill {
  id: string;
  name: string;
}

interface GoldenSetListProps {
  initialData: GoldenSet[];
}

const gsAccessors = {
  name: (gs: GoldenSet) => gs.name,
  doc_type: (gs: GoldenSet) => gs.skill_doc_type,
  case_count: (gs: GoldenSet) => gs.case_count,
  created_at: (gs: GoldenSet) => gs.created_at,
} as const;

type GsSortKey = keyof typeof gsAccessors;

export function GoldenSetList({ initialData }: GoldenSetListProps) {
  const router = useRouter();
  const [data, setData] = useState<GoldenSet[]>(initialData);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [filterSkill, setFilterSkill] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((json) => setSkills(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => {});
  }, []);

  const searched = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((gs) =>
      gs.name.toLowerCase().includes(q) ||
      (gs.skill_doc_type?.toLowerCase().includes(q) ?? false)
    );
  }, [data, search]);

  const filtered = searched.filter((gs) => {
    if (filterSkill !== "all" && gs.skill_id !== filterSkill) return false;
    if (filterStatus !== "all" && gs.status !== filterStatus) return false;
    return true;
  });

  const { sorted, sort, onSort } = useSortable<GoldenSet, GsSortKey>(filtered, gsAccessors);
  const { page, pageCount, paginatedItems, onPageChange } = usePagination(sorted);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete golden set "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/golden-sets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev.filter((gs) => gs.id !== id));
      toast.success("Golden set deleted");
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search golden sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[200px]"
            aria-label="Search"
          />
        </div>
        <Select value={filterSkill} onValueChange={(v) => setFilterSkill(v ?? "all")}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by skill">
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {skills.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="annotated">Annotated</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>

        {(filterSkill !== "all" || filterStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterSkill("all"); setFilterStatus("all"); }}
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
              <SortableHead active={sort?.key === "name"} direction={sort?.key === "name" ? sort.direction : null} onClick={() => onSort("name")}>Name</SortableHead>
              <SortableHead active={sort?.key === "doc_type"} direction={sort?.key === "doc_type" ? sort.direction : null} onClick={() => onSort("doc_type")}>Skill</SortableHead>
              <SortableHead active={sort?.key === "case_count"} direction={sort?.key === "case_count" ? sort.direction : null} onClick={() => onSort("case_count")} className="text-right">Cases</SortableHead>
              <TableHead>Status</TableHead>
              <SortableHead active={sort?.key === "created_at"} direction={sort?.key === "created_at" ? sort.direction : null} onClick={() => onSort("created_at")}>Created</SortableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={Database}
                    title="No golden sets found"
                    description="Create a golden set or adjust your filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((gs) => (
                <TableRow key={gs.id}>
                  <TableCell>
                    <Link
                      href={`/golden-sets/${gs.id}`}
                      className="font-medium hover:underline text-foreground"
                    >
                      {gs.name}
                    </Link>
                    {gs.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {gs.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{gs.skill_name ?? "—"}</span>
                    {gs.skill_doc_type && (
                      <span className="block text-xs text-muted-foreground">{gs.skill_doc_type}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {gs.case_count}
                  </TableCell>
                  <TableCell>
                    <CaseStatusBadge status={gs.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(gs.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        aria-label="Edit"
                        render={<Link href={`/golden-sets/${gs.id}/edit`} />}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Export"
                        aria-label="Export"
                        render={<a href={`/api/golden-sets/${gs.id}/export`} download />}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        aria-label="Delete"
                        disabled={gs.status !== "draft"}
                        onClick={() => handleDelete(gs.id, gs.name)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
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

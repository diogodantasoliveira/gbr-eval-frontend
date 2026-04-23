"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "./case-status-badge";
import { Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

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

export function GoldenSetList({ initialData }: GoldenSetListProps) {
  const router = useRouter();
  const [data, setData] = useState<GoldenSet[]>(initialData);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filterSkill, setFilterSkill] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((json) => setSkills(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => {});
  }, []);

  const filtered = data.filter((gs) => {
    if (filterSkill !== "all" && gs.skill_id !== filterSkill) return false;
    if (filterStatus !== "all" && gs.status !== filterStatus) return false;
    return true;
  });

  const { page, pageCount, paginatedItems, onPageChange } = usePagination(filtered);

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
      <div className="flex items-center gap-3">
        <Select value={filterSkill} onValueChange={(v) => setFilterSkill(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[160px]">
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
              <TableHead>Name</TableHead>
              <TableHead>Skill</TableHead>
              <TableHead className="text-right">Cases</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                  No golden sets found.
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
                    {new Date(gs.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        render={<Link href={`/golden-sets/${gs.id}/edit`} />}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Export"
                        render={<a href={`/api/golden-sets/${gs.id}/export`} download />}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
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

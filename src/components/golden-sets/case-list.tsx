"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaseStatusBadge } from "./case-status-badge";
import { TagBadge } from "@/components/tags/tag-badge";
import { Pencil, Clock, Plus } from "lucide-react";
import { formatDate } from "@/lib/format-date";

interface GoldenSetCase {
  id: string;
  case_number: number;
  status: string;
  tags: string[];
  annotator: string | null;
  created_at: number;
}

interface CaseListProps {
  goldenSetId: string;
  cases: GoldenSetCase[];
}

const ALL_TAGS = ["seed", "regression", "incident", "edge_case", "hitl"];

export function CaseList({ goldenSetId, cases: initialCases }: CaseListProps) {
  const [cases] = useState<GoldenSetCase[]>(initialCases);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTags, setFilterTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const filtered = cases.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterTags.length > 0 && !filterTags.every((t) => c.tags.includes(t))) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-[150px]">
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

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Tags:</span>
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="focus:outline-none"
              >
                <TagBadge
                  tag={tag}
                  className={filterTags.includes(tag) ? "ring-2 ring-ring" : "opacity-60 hover:opacity-100"}
                />
              </button>
            ))}
          </div>

          {(filterStatus !== "all" || filterTags.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterStatus("all"); setFilterTags([]); }}
            >
              Clear
            </Button>
          )}
        </div>

        <Button size="sm" render={<Link href={`/golden-sets/${goldenSetId}/cases/new`} />}>
          <Plus className="size-4 mr-1.5" />
          Add Case
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Case #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Annotator</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                  No cases found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono tabular-nums text-sm">
                    #{c.case_number.toString().padStart(3, "0")}
                  </TableCell>
                  <TableCell>
                    <CaseStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                      {c.tags.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.annotator || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Annotate" render={<Link href={`/golden-sets/${goldenSetId}/cases/${c.id}`} />}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" title="History" render={<Link href={`/golden-sets/${goldenSetId}/cases/${c.id}/history`} />}>
                        <Clock className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} case{filtered.length !== 1 ? "s" : ""} shown
        {cases.length !== filtered.length ? ` of ${cases.length} total` : ""}
      </p>
    </div>
  );
}

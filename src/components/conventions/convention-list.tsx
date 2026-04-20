"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Eye } from "lucide-react";
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

export interface ConventionRow {
  id: string;
  name: string;
  category: string;
  severity: string;
  detection_type: string;
  source: string | null;
  status: string;
  updated_at: number;
}

interface ConventionListProps {
  initialData: ConventionRow[];
}

const CATEGORIES = [
  "tenant_isolation",
  "naming",
  "architecture",
  "security",
  "data_handling",
  "api_design",
];

const SEVERITIES = ["critical", "high", "medium", "low"];

function severityVariant(s: string): "default" | "outline" | "secondary" | "destructive" {
  if (s === "critical") return "destructive";
  if (s === "high") return "default";
  if (s === "medium") return "secondary";
  return "outline";
}

function severityColor(s: string): string {
  if (s === "critical") return "text-red-600 dark:text-red-400";
  if (s === "high") return "text-orange-600 dark:text-orange-400";
  if (s === "medium") return "text-yellow-600 dark:text-yellow-500";
  return "text-green-600 dark:text-green-400";
}

function detectionVariant(d: string): "default" | "outline" | "secondary" {
  if (d === "regex") return "default";
  if (d === "ast") return "secondary";
  return "outline";
}

export function ConventionList({ initialData }: ConventionListProps) {
  const router = useRouter();
  const [data, setData] = useState<ConventionRow[]>(initialData);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const filtered = data.filter((r) => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
    return true;
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete convention rule "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/conventions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev.filter((r) => r.id !== id));
      toast.success("Convention rule deleted");
      router.refresh();
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

        <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v ?? "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterCategory !== "all" || filterSeverity !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCategory("all");
              setFilterSeverity("all");
            }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {data.length} rules
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Detection</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  No convention rules found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/conventions/${r.id}`}
                      className="font-mono text-xs font-medium hover:underline text-foreground"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${severityColor(r.severity)}`}>
                      {r.severity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={detectionVariant(r.detection_type)} className="text-xs">
                      {r.detection_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                    {r.source ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "active" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="View"
                        render={<Link href={`/conventions/${r.id}`} />}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        render={<Link href={`/conventions/${r.id}/edit`} />}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete"
                        onClick={() => handleDelete(r.id, r.name)}
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
    </div>
  );
}

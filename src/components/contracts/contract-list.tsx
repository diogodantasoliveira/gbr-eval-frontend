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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ContractRow {
  id: string;
  service_name: string;
  endpoint: string;
  method: string;
  version: number;
  status: string;
  source_commit: string | null;
  created_at: number;
  updated_at: number;
}

interface ContractListProps {
  initialData: ContractRow[];
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "POST":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800";
    case "PUT":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "DELETE":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "";
  }
}

function statusVariant(s: string): "default" | "outline" | "secondary" {
  if (s === "active") return "default";
  return "outline";
}

export function ContractList({ initialData }: ContractListProps) {
  const router = useRouter();
  const [data, setData] = useState<ContractRow[]>(initialData);

  // Group by service_name
  const grouped = data.reduce<Record<string, ContractRow[]>>((acc, c) => {
    if (!acc[c.service_name]) acc[c.service_name] = [];
    acc[c.service_name].push(c);
    return acc;
  }, {});

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete contract "${label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contract deleted");
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to delete");
    }
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-border">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                No contracts found. Import an OpenAPI spec or create one manually.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([service, rows]) => (
        <div key={service} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {service}
          </h2>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono font-semibold",
                          methodColor(c.method)
                        )}
                      >
                        {c.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/contracts/${c.id}`}
                        className="font-mono text-xs hover:underline text-foreground"
                      >
                        {c.endpoint}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        v{c.version}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)} className="text-xs">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.source_commit ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.source_commit.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="View"
                          render={<Link href={`/contracts/${c.id}`} />}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit"
                          render={<Link href={`/contracts/${c.id}/edit`} />}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete"
                          onClick={() => handleDelete(c.id, `${c.method} ${c.endpoint}`)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, CheckCircle2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ImportResult {
  created: number;
  skipped: number;
  results: Array<{ name: string; status: "created" | "skipped" }>;
}

interface ImportClaudeMdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREVIEW_RULES = [
  { name: "bff_atom_headers", category: "tenant_isolation", severity: "critical" },
  { name: "client_credentials_include", category: "api_design", severity: "high" },
  { name: "paginated_response_check", category: "data_handling", severity: "medium" },
  { name: "turbopack_cache_clear", category: "architecture", severity: "low" },
  { name: "dark_mode_variants", category: "architecture", severity: "medium" },
  { name: "fastapi_fixed_before_param", category: "api_design", severity: "high" },
  { name: "db_create_if_not_exists", category: "data_handling", severity: "medium" },
  { name: "billing_api_prefix", category: "api_design", severity: "high" },
  { name: "correct_cd_before_command", category: "architecture", severity: "medium" },
  { name: "provider_action_slug", category: "naming", severity: "high" },
  { name: "no_hardcoded_business_data", category: "data_handling", severity: "critical" },
  { name: "user_role_varchar", category: "data_handling", severity: "critical" },
  { name: "jwt_custom_roles_claim", category: "security", severity: "critical" },
  { name: "bff_ports_services_md", category: "architecture", severity: "high" },
  { name: "middleware_exclude_api", category: "security", severity: "high" },
  { name: "curl_before_done", category: "architecture", severity: "medium" },
  { name: "secrets_scan_new_repo", category: "security", severity: "high" },
  { name: "verify_endpoint_exists", category: "architecture", severity: "high" },
];

function severityColor(s: string): string {
  if (s === "critical") return "text-red-600 dark:text-red-400";
  if (s === "high") return "text-orange-600 dark:text-orange-400";
  if (s === "medium") return "text-yellow-600 dark:text-yellow-500";
  return "text-green-600 dark:text-green-400";
}

export function ImportClaudeMdDialog({ open, onOpenChange }: ImportClaudeMdDialogProps) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/conventions/import-claude-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      setResult(data as ImportResult);
      toast.success(`Imported ${data.created} rules, skipped ${data.skipped}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Seed 18 Convention Rules
          </DialogTitle>
          <DialogDescription>
            Imports the 18 engineering convention rules from gbr-engines CLAUDE.md. Rules that already
            exist will be skipped.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="size-4" />
                {result.created} created
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <SkipForward className="size-4" />
                {result.skipped} skipped
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {result.results.map((r) => (
                <div key={r.name} className="flex items-center justify-between px-3 py-1.5">
                  <span className="font-mono text-xs text-foreground">{r.name}</span>
                  <span
                    className={`text-xs font-medium ${
                      r.status === "created"
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The following {PREVIEW_RULES.length} rules will be seeded:
            </p>
            <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {PREVIEW_RULES.map((r) => (
                <div key={r.name} className="flex items-center gap-3 px-3 py-1.5">
                  <span className="font-mono text-xs text-foreground flex-1">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.category}</span>
                  <span className={`text-xs font-medium ${severityColor(r.severity)}`}>
                    {r.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : "Seed 18 Rules"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

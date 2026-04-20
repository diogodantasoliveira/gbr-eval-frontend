"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap } from "lucide-react";

const TARGET_REPOS = [
  { value: "atom-back-end", label: "atom-back-end" },
  { value: "engine-billing", label: "engine-billing" },
  { value: "engine-integracao", label: "engine-integracao" },
  { value: "garantia_ia", label: "garantia_ia" },
  { value: "notifier", label: "notifier" },
];

interface GenerateTaskButtonProps {
  ruleId: string;
  ruleName: string;
}

export function GenerateTaskButton({ ruleId }: GenerateTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const [repo, setRepo] = useState("");
  const [scanTarget, setScanTarget] = useState("**/*.py");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ task_id?: string; error?: string } | null>(null);

  async function handleGenerate() {
    if (!repo) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/conventions/${ruleId}/generate-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, scan_target: scanTarget }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ task_id: data.task_id });
      } else {
        setResult({ error: data.error || "Failed to generate" });
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Zap className="size-3.5" />
        Generate Task
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Generate Task from Rule</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setResult(null);
          }}
        >
          Cancel
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Target Repository</Label>
        <Select value={repo} onValueChange={(v) => setRepo(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select repo..." />
          </SelectTrigger>
          <SelectContent>
            {TARGET_REPOS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Scan Target</Label>
        <Input
          value={scanTarget}
          onChange={(e) => setScanTarget(e.target.value)}
          placeholder="**/*.py"
          className="font-mono text-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleGenerate} disabled={!repo || loading}>
          {loading ? "Generating..." : "Create Task"}
        </Button>
      </div>

      {result?.task_id && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Created: <code className="font-mono">{result.task_id}</code>
        </p>
      )}
      {result?.error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Upload, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { RunList } from "@/components/runs/run-list";
import { ImportRunDialog } from "@/components/runs/import-run-dialog";
import { Button } from "@/components/ui/button";

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

export default function RunsPage() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  async function loadRuns() {
    try {
      const res = await fetch("/api/runs");
      if (res.ok) {
        const json = await res.json();
        setRuns(Array.isArray(json) ? json : (json?.data ?? []));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  // Reload after dialog closes (import may have happened)
  function handleDialogChange(open: boolean) {
    setImportOpen(open);
    if (!open) loadRuns();
  }

  return (
    <div>
      <PageHeader
        title="Eval Runs"
        description="Import and explore evaluation run results"
      >
        <Button variant="outline" render={<Link href="/runs/trends" />}>
          <TrendingUp className="size-3.5" />
          Trends
        </Button>
        <Button variant="outline" render={<Link href="/runs/compare" />}>
          Compare
        </Button>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="size-3.5" />
          Import Run
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <RunList runs={runs} />
      )}

      <ImportRunDialog open={importOpen} onOpenChange={handleDialogChange} />
    </div>
  );
}

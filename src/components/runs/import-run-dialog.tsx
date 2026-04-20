"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ImportRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Preview {
  run_id: string;
  layer: string;
  tier?: string;
  tasks_total: number;
  tasks_passed: number;
  tasks_failed: number;
  overall_score: number;
  gate_result?: string;
}

export function ImportRunDialog({ open, onOpenChange }: ImportRunDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [json, setJson] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function handleJsonChange(value: string) {
    setJson(value);
    setParseError(null);
    setPreview(null);

    if (!value.trim()) return;

    try {
      const parsed = JSON.parse(value);
      if (!parsed.run_id || !parsed.layer) {
        setParseError("JSON must have run_id and layer fields.");
        return;
      }
      setPreview({
        run_id: parsed.run_id,
        layer: parsed.layer,
        tier: parsed.tier,
        tasks_total: parsed.tasks_total ?? 0,
        tasks_passed: parsed.tasks_passed ?? 0,
        tasks_failed: parsed.tasks_failed ?? 0,
        overall_score: parsed.overall_score ?? 0,
        gate_result: parsed.gate_result,
      });
    } catch {
      setParseError("Invalid JSON format.");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJson(text);
      handleJsonChange(text);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!json.trim() || !preview) return;

    setImporting(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        toast.error("Invalid JSON format");
        return;
      }

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }

      toast.success(`Run "${preview.run_id}" imported successfully`);
      onOpenChange(false);
      setJson("");
      setPreview(null);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    if (!importing) {
      onOpenChange(false);
      setJson("");
      setPreview(null);
      setParseError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CLI Run</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* File upload */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              <Upload className="size-3.5" />
              Upload JSON file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <span className="text-xs text-muted-foreground">or paste below</span>
          </div>

          {/* Textarea */}
          <Textarea
            placeholder='{"run_id": "run_20260418_143000", "layer": "product", ...}'
            value={json}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={8}
            className="font-mono text-xs resize-y"
            disabled={importing}
          />

          {/* Parse error */}
          {parseError && (
            <p className="text-xs text-destructive">{parseError}</p>
          )}

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Preview
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <dt className="text-muted-foreground">Run ID</dt>
                  <dd className="font-mono font-medium text-foreground truncate">{preview.run_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Layer / Tier</dt>
                  <dd className="font-medium text-foreground">
                    {preview.layer}{preview.tier ? ` / ${preview.tier}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tasks</dt>
                  <dd className="font-medium text-foreground">
                    {preview.tasks_passed}✓ / {preview.tasks_failed}✗ / {preview.tasks_total}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Score</dt>
                  <dd className="font-mono font-semibold text-foreground">
                    {(preview.overall_score * 100).toFixed(1)}%
                  </dd>
                </div>
                {preview.gate_result && (
                  <div>
                    <dt className="text-muted-foreground">Gate</dt>
                    <dd className="font-medium text-foreground uppercase">
                      {preview.gate_result.replace(/_/g, " ")}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || !preview || !!parseError}
          >
            {importing ? "Importing..." : "Import Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

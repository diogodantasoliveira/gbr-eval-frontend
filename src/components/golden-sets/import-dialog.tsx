"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ImportResult {
  imported: number;
  errors: Array<{ index: number; error: string }>;
}

interface ImportDialogProps {
  goldenSetId: string;
  onImported?: () => void;
}

export function ImportDialog({ goldenSetId, onImported }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText((ev.target?.result as string) ?? "");
      setParseError(null);
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setJsonText(e.target.value);
    setParseError(null);
    setResult(null);
  }

  async function handleImport() {
    setParseError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setParseError("Invalid JSON — please check your input.");
      return;
    }

    if (!Array.isArray(parsed)) {
      setParseError("Expected a JSON array of cases.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/golden-sets/${goldenSetId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = (await res.json()) as ImportResult | { error: unknown };

      if (!res.ok) {
        const errData = data as { error: unknown };
        setParseError(
          typeof errData.error === "string"
            ? errData.error
            : "Import failed. Check the format."
        );
        return;
      }

      setResult(data as ImportResult);
      if ((data as ImportResult).imported > 0) {
        onImported?.();
      }
    } catch {
      setParseError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setJsonText("");
      setParseError(null);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" />
        }
      >
        <Upload className="size-3.5" />
        Import Cases
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Cases</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* File input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Upload .json file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80 cursor-pointer"
            />
          </div>

          {/* Textarea */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Or paste JSON array
            </label>
            <Textarea
              value={jsonText}
              onChange={handleTextChange}
              placeholder={'[\n  {\n    "case_number": 1,\n    "expected_output": { ... }\n  }\n]'}
              className="font-mono text-xs min-h-[180px]"
            />
          </div>

          {/* Parse error */}
          {parseError && (
            <p className="text-xs text-destructive">{parseError}</p>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-1.5">
              <p className="text-sm font-medium">
                {result.imported} case{result.imported !== 1 ? "s" : ""} imported
              </p>
              {result.errors.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="text-xs text-destructive space-y-0.5 list-disc list-inside">
                    {result.errors.map((e) => (
                      <li key={e.index}>
                        Case #{e.index + 1}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={handleImport}
            disabled={loading || !jsonText.trim()}
          >
            {loading ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

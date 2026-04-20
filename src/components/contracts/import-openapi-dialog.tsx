"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileJson } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ImportResult {
  imported: number;
  endpoints: string[];
}

interface ImportOpenApiDialogProps {
  trigger?: React.ReactNode;
}

export function ImportOpenApiDialog({ trigger }: ImportOpenApiDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [specText, setSpecText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setServiceName("");
    setSpecText("");
    setParseError(null);
    setPreview(null);
    setResult(null);
    setImporting(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setSpecText(text);
      tryPreview(text);
    };
    reader.readAsText(file);
  }

  function tryPreview(text: string) {
    setParseError(null);
    setPreview(null);
    try {
      const spec = JSON.parse(text);
      const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
      if (!paths) {
        setParseError("No 'paths' found in spec");
        return;
      }
      const endpoints: string[] = [];
      for (const [path, pathItem] of Object.entries(paths)) {
        for (const method of Object.keys(pathItem)) {
          const upper = method.toUpperCase();
          if (["GET", "POST", "PUT", "DELETE"].includes(upper)) {
            endpoints.push(`${upper} ${path}`);
          }
        }
      }
      setPreview(endpoints);
    } catch (e) {
      setParseError("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  function handleSpecChange(text: string) {
    setSpecText(text);
    if (text.trim()) tryPreview(text);
    else {
      setPreview(null);
      setParseError(null);
    }
  }

  async function handleImport() {
    if (!serviceName.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!specText.trim()) {
      toast.error("Spec is required");
      return;
    }

    let spec: Record<string, unknown>;
    try {
      spec = JSON.parse(specText);
    } catch {
      setParseError("Invalid JSON");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/contracts/import-openapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, service_name: serviceName }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data as ImportResult);
        toast.success(`Imported ${(data as ImportResult).imported} contracts`);
        router.refresh();
      } else {
        toast.error(data.error ?? "Import failed");
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger
        render={
          trigger ? (
            <span>{trigger}</span>
          ) : (
            <Button variant="outline">
              <FileJson className="size-4" />
              Import OpenAPI
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import OpenAPI Spec</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Successfully imported {result.imported} contract{result.imported !== 1 ? "s" : ""}.
            </p>
            <div className="rounded-md border border-border bg-muted/20 p-3 max-h-48 overflow-y-auto">
              {result.endpoints.map((ep) => (
                <div key={ep} className="font-mono text-xs py-0.5 text-foreground">
                  {ep}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="import-service-name">Service Name</Label>
              <Input
                id="import-service-name"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. ai-engine"
              />
            </div>

            <div className="space-y-1.5">
              <Label>OpenAPI Spec (JSON)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  Upload .json
                </Button>
                <span className="text-xs text-muted-foreground">or paste below</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Textarea
                value={specText}
                onChange={(e) => handleSpecChange(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                placeholder='{"openapi":"3.0.0","paths":{"/api/v1/foo":{"get":{}}}}'
              />
              {parseError && (
                <p className="text-xs text-destructive">{parseError}</p>
              )}
            </div>

            {preview && preview.length > 0 && (
              <div className="space-y-1.5">
                <Label>Preview — {preview.length} endpoint{preview.length !== 1 ? "s" : ""} to import</Label>
                <div className="rounded-md border border-border bg-muted/20 p-2 max-h-32 overflow-y-auto">
                  {preview.map((ep) => (
                    <div key={ep} className="font-mono text-xs py-0.5 text-foreground">
                      {ep}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview && preview.length === 0 && !parseError && (
              <p className="text-xs text-muted-foreground">
                No supported endpoints found (GET, POST, PUT, DELETE).
              </p>
            )}
          </div>
        )}

        <DialogFooter showCloseButton={!!result}>
          {!result && (
            <>
              <Button
                onClick={handleImport}
                disabled={importing || !!parseError || !preview || preview.length === 0 || !serviceName.trim()}
              >
                {importing ? "Importing..." : `Import ${preview?.length ?? 0} contract${preview?.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

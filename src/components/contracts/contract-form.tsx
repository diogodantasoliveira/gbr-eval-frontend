"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

interface ContractFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    service_name: string;
    endpoint: string;
    method: string;
    schema_snapshot: Record<string, unknown>;
    source_commit: string | null;
    status: string;
  };
}

export function ContractForm({ mode, initialData }: ContractFormProps) {
  const router = useRouter();

  const [serviceName, setServiceName] = useState(initialData?.service_name ?? "");
  const [endpoint, setEndpoint] = useState(initialData?.endpoint ?? "");
  const [method, setMethod] = useState(initialData?.method ?? "GET");
  const [sourceCommit, setSourceCommit] = useState(initialData?.source_commit ?? "");
  const [schemaText, setSchemaText] = useState(
    initialData?.schema_snapshot
      ? JSON.stringify(initialData.schema_snapshot, null, 2)
      : "{}"
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validateSchema() {
    try {
      JSON.parse(schemaText);
      setSchemaError(null);
      return true;
    } catch (e) {
      setSchemaError("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateSchema()) return;

    let schemaSnapshot: Record<string, unknown>;
    try {
      schemaSnapshot = JSON.parse(schemaText);
    } catch {
      setSchemaError("Invalid JSON");
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        mode === "create"
          ? { service_name: serviceName, endpoint, method, schema_snapshot: schemaSnapshot, source_commit: sourceCommit }
          : { service_name: serviceName, endpoint, method, schema_snapshot: schemaSnapshot, source_commit: sourceCommit, change_reason: changeReason };

      const url = mode === "create" ? "/api/contracts" : `/api/contracts/${initialData!.id}`;
      const httpMethod = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(mode === "create" ? "Contract created" : "Contract updated");
        router.push(`/contracts/${mode === "create" ? data.id : initialData!.id}`);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Failed to save contract");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="service_name">Service Name</Label>
          <Input
            id="service_name"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g. ai-engine"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="method">Method</Label>
          <Select value={method} onValueChange={(v) => { if (v) setMethod(v); }}>
            <SelectTrigger id="method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="endpoint">Endpoint</Label>
        <Input
          id="endpoint"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="e.g. /api/v1/documents/{id}/extract"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="source_commit">Source Commit</Label>
        <Input
          id="source_commit"
          value={sourceCommit}
          onChange={(e) => setSourceCommit(e.target.value)}
          placeholder="e.g. abc1234"
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="schema_snapshot">Schema Snapshot (JSON)</Label>
        <Textarea
          id="schema_snapshot"
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          onBlur={validateSchema}
          rows={16}
          className="font-mono text-xs"
          placeholder="{}"
        />
        {schemaError && (
          <p className="text-xs text-destructive">{schemaError}</p>
        )}
      </div>

      {mode === "edit" && (
        <div className="space-y-1.5">
          <Label htmlFor="change_reason">Change Reason</Label>
          <Input
            id="change_reason"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Describe what changed and why"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : mode === "create" ? "Create Contract" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

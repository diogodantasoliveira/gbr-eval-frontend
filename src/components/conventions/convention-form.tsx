"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
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

const CATEGORIES = [
  "tenant_isolation",
  "naming",
  "architecture",
  "security",
  "data_handling",
  "api_design",
];

const SEVERITIES = ["critical", "high", "medium", "low"];
const DETECTION_TYPES = ["regex", "ast", "llm_judge"];

interface ConventionFormData {
  name: string;
  category: string;
  severity: string;
  detection_type: string;
  description: string;
  detection_pattern: string;
  source: string;
}

interface ConventionFormProps {
  mode: "create" | "edit";
  conventionId?: string;
  initialData?: Partial<ConventionFormData>;
  onSaved?: (id: string) => void;
}

export function ConventionForm({ mode, conventionId, initialData, onSaved }: ConventionFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ConventionFormData>({
    name: initialData?.name ?? "",
    category: initialData?.category ?? "architecture",
    severity: initialData?.severity ?? "medium",
    detection_type: initialData?.detection_type ?? "regex",
    description: initialData?.description ?? "",
    detection_pattern: initialData?.detection_pattern ?? "",
    source: initialData?.source ?? "",
  });
  const initialRef = useRef(form)
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialRef.current)
  useUnsavedChanges(isDirty)

  function handleChange(field: keyof ConventionFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url =
        mode === "create" ? "/api/conventions" : `/api/conventions/${conventionId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Request failed");
        return;
      }

      toast.success(mode === "create" ? "Convention rule created" : "Convention rule updated");

      if (onSaved) {
        onSaved(data.id);
      } else if (mode === "create") {
        router.push(`/conventions/${data.id}`);
      } else {
        router.push(`/conventions/${conventionId}`);
      }
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. bff_atom_headers"
          required
          disabled={mode === "edit"}
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, underscores only. Cannot be changed after creation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => v != null && handleChange("category", v)}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="severity">Severity</Label>
          <Select
            value={form.severity}
            onValueChange={(v) => v != null && handleChange("severity", v)}
          >
            <SelectTrigger id="severity" className="w-full">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detection_type">Detection Type</Label>
        <Select
          value={form.detection_type}
          onValueChange={(v) => v != null && handleChange("detection_type", v)}
        >
          <SelectTrigger id="detection_type" className="w-full max-w-xs">
            <SelectValue placeholder="Select detection type" />
          </SelectTrigger>
          <SelectContent>
            {DETECTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Describe what this convention enforces and why it matters..."
          rows={3}
        />
      </div>

      {form.detection_type === "regex" && (
        <div className="space-y-1.5">
          <Label htmlFor="detection_pattern">Detection Pattern (regex)</Label>
          <Textarea
            id="detection_pattern"
            value={form.detection_pattern}
            onChange={(e) => handleChange("detection_pattern", e.target.value)}
            placeholder="e.g. serviceAuthKey\("
            rows={2}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Regex pattern that detects violations. Match = violation found.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="source">Source</Label>
        <Input
          id="source"
          value={form.source}
          onChange={(e) => handleChange("source", e.target.value)}
          placeholder="e.g. gbr-engines CLAUDE.md #1"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Rule"
            : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

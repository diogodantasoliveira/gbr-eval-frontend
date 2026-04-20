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
import { PatternEditor } from "@/components/conventions/pattern-editor";

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

interface ConventionEditFormProps {
  conventionId: string;
  initialData: {
    name: string;
    category: string;
    severity: string;
    detection_type: string;
    description: string;
    detection_pattern: string;
    source: string;
    positive_example: string;
    negative_example: string;
  };
}

export function ConventionEditForm({ conventionId, initialData }: ConventionEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: initialData.category,
    severity: initialData.severity,
    detection_type: initialData.detection_type,
    description: initialData.description,
    detection_pattern: initialData.detection_pattern,
    source: initialData.source,
  });
  const [positiveExample, setPositiveExample] = useState(initialData.positive_example);
  const [negativeExample, setNegativeExample] = useState(initialData.negative_example);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conventions/${conventionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          positive_example: positiveExample,
          negative_example: negativeExample,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Request failed");
        return;
      }

      toast.success("Convention rule updated");
      router.push(`/conventions/${conventionId}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Name (read-only) */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={initialData.name} disabled />
        <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => v != null && handleChange("category", v)}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DETECTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
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

      <div className="border-t border-border pt-6">
        <PatternEditor
          positiveExample={positiveExample}
          negativeExample={negativeExample}
          onPositiveChange={setPositiveExample}
          onNegativeChange={setNegativeExample}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
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

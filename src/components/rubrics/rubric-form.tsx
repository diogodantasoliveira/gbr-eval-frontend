"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Skill {
  id: string;
  name: string;
}

interface RubricFormData {
  name: string;
  skill_id: string;
  category: string;
  rubric_text: string;
  min_score: string;
  model: string;
  status: string;
}

interface RubricFormProps {
  mode: "create" | "edit";
  rubricId?: string;
  initialData?: Partial<RubricFormData> & { promotion_status?: string };
  skills: Skill[];
}

const MODELS = [
  "claude-sonnet-4-5-20250514",
  "claude-opus-4-5",
  "claude-haiku-4-5",
  "claude-sonnet-3-7",
];

const CATEGORIES = ["extraction", "classification", "decision", "general"];

export function RubricForm({ mode, rubricId, initialData, skills }: RubricFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<RubricFormData>({
    name: initialData?.name ?? "",
    skill_id: initialData?.skill_id ?? "",
    category: initialData?.category ?? "general",
    rubric_text: initialData?.rubric_text ?? "",
    min_score: String(initialData?.min_score ?? "3.0"),
    model: initialData?.model ?? "claude-sonnet-4-5-20250514",
    status: initialData?.status ?? "draft",
  });
  const [changeReason, setChangeReason] = useState("");

  function handleChange(field: keyof RubricFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.rubric_text.trim()) newErrors.rubric_text = "Rubric text is required";
    const score = parseFloat(form.min_score);
    if (isNaN(score) || score < 1 || score > 5) newErrors.min_score = "Min score must be between 1.0 and 5.0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const url = mode === "create" ? "/api/rubrics" : `/api/rubrics/${rubricId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const payload: Record<string, unknown> = {
        ...form,
        skill_id: form.skill_id || null,
        min_score: parseFloat(form.min_score),
      };

      if (mode === "edit" && changeReason) {
        payload.change_reason = changeReason;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors(data.fieldErrors);
        } else {
          toast.error(data.error ?? "Request failed");
        }
        return;
      }

      toast.success(mode === "create" ? "Rubric created" : "Rubric updated");

      if (mode === "create") {
        router.push(`/rubrics/${data.id}`);
      } else {
        router.push(`/rubrics/${rubricId}`);
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
      <FormField error={errors.name}>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. extraction_quality_v1"
          aria-invalid={!!errors.name}
        />
      </FormField>

      <FormField>
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
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField>
        <Label htmlFor="skill_id">Skill (optional)</Label>
        <Select
          value={form.skill_id}
          onValueChange={(v) => v != null && handleChange("skill_id", v === "__none__" ? "" : v)}
        >
          <SelectTrigger id="skill_id" className="w-full">
            <SelectValue placeholder="No skill association" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {skills.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField>
        <Label htmlFor="model">Model</Label>
        <Select
          value={form.model}
          onValueChange={(v) => v != null && handleChange("model", v)}
        >
          <SelectTrigger id="model" className="w-full">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField error={errors.min_score}>
        <Label htmlFor="min_score">Min Score (1.0 – 5.0)</Label>
        <Input
          id="min_score"
          type="number"
          min={1}
          max={5}
          step={0.1}
          value={form.min_score}
          onChange={(e) => handleChange("min_score", e.target.value)}
          aria-invalid={!!errors.min_score}
        />
      </FormField>

      <FormField>
        <Label htmlFor="status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) => v != null && handleChange("status", v)}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {mode === "edit" && initialData?.promotion_status && (
        <div className="space-y-1.5">
          <Label>Promotion Status</Label>
          <div>
            <Badge variant={initialData.promotion_status === "blocking" ? "default" : "outline"}>
              {initialData.promotion_status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Promotion status is set automatically based on calibration data.
            </p>
          </div>
        </div>
      )}

      <FormField error={errors.rubric_text}>
        <Label htmlFor="rubric_text">Rubric Text</Label>
        <Textarea
          id="rubric_text"
          value={form.rubric_text}
          onChange={(e) => handleChange("rubric_text", e.target.value)}
          placeholder="Describe what this rubric evaluates and how the LLM judge should score responses..."
          rows={10}
          className="font-mono text-xs"
          aria-invalid={!!errors.rubric_text}
        />
      </FormField>

      {mode === "edit" && (
        <FormField>
          <Label htmlFor="change_reason">Change Reason (optional)</Label>
          <Input
            id="change_reason"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Brief description of what changed and why"
          />
          <p className="text-xs text-muted-foreground">
            A version snapshot is created automatically when rubric text changes.
          </p>
        </FormField>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Rubric"
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

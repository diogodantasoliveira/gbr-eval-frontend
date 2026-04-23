"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SkillFormData {
  name: string;
  doc_type: string;
  version: string;
  description: string;
  priority: string;
  status: string;
}

interface SkillFormProps {
  mode: "create" | "edit";
  skillId?: string;
  initialData?: Partial<SkillFormData>;
}

export function SkillForm({ mode, skillId, initialData }: SkillFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<SkillFormData>({
    name: initialData?.name ?? "",
    doc_type: initialData?.doc_type ?? "",
    version: initialData?.version ?? "1.0.0",
    description: initialData?.description ?? "",
    priority: initialData?.priority ?? "P1",
    status: initialData?.status ?? "active",
  });

  function handleChange(field: keyof SkillFormData, value: string) {
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
    if (!form.doc_type.trim()) newErrors.doc_type = "Doc type is required";
    if (!form.version.trim()) newErrors.version = "Version is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const url =
        mode === "create" ? "/api/skills" : `/api/skills/${skillId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

      toast.success(
        mode === "create" ? "Skill created" : "Skill updated"
      );

      if (mode === "create") {
        router.push(`/skills/${data.id}`);
      } else {
        router.push(`/skills/${skillId}`);
      }
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <FormField error={errors.name}>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. matricula_v1"
          aria-invalid={!!errors.name}
        />
      </FormField>

      <FormField error={errors.doc_type}>
        <Label htmlFor="doc_type">Doc Type</Label>
        <Input
          id="doc_type"
          value={form.doc_type}
          onChange={(e) => handleChange("doc_type", e.target.value)}
          placeholder="e.g. matricula"
          aria-invalid={!!errors.doc_type}
        />
      </FormField>

      <FormField error={errors.version}>
        <Label htmlFor="version">Version</Label>
        <Input
          id="version"
          value={form.version}
          onChange={(e) => handleChange("version", e.target.value)}
          placeholder="1.0.0"
          aria-invalid={!!errors.version}
        />
      </FormField>

      <FormField>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </FormField>

      <FormField>
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={form.priority}
          onValueChange={(value) => value != null && handleChange("priority", value)}
        >
          <SelectTrigger id="priority" className="w-full">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="P0">P0 — Critical</SelectItem>
            <SelectItem value="P1">P1 — High</SelectItem>
            <SelectItem value="P2">P2 — Medium</SelectItem>
            <SelectItem value="P3">P3 — Low</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField>
        <Label htmlFor="status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(value) => value != null && handleChange("status", value)}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Skill"
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

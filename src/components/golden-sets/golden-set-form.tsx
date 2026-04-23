"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Skill {
  id: string;
  name: string;
  doc_type: string;
}

interface GoldenSetFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    skill_id: string;
  };
}

export function GoldenSetForm({ mode, initialData }: GoldenSetFormProps) {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    skill_id: initialData?.skill_id ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
  });
  const initialRef = useRef(form)
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialRef.current)
  useUnsavedChanges(isDirty)

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((json) => setSkills(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => toast.error("Failed to load skills"));
  }, []);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
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
    if (!form.skill_id) newErrors.skill_id = "Please select a skill";
    if (!form.name.trim()) newErrors.name = "Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === "create") {
        const res = await fetch("/api/golden-sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Failed to create");
        }
        const created = await res.json();
        toast.success("Golden set created");
        router.push(`/golden-sets/${created.id}`);
      } else {
        const res = await fetch(`/api/golden-sets/${initialData!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, description: form.description }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Failed to update");
        }
        toast.success("Golden set updated");
        router.push(`/golden-sets/${initialData!.id}`);
        router.refresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <FormField error={errors.skill_id}>
        <Label htmlFor="skill_id">Skill</Label>
        <Select
          value={form.skill_id}
          onValueChange={(v) => handleChange("skill_id", v ?? form.skill_id)}
          disabled={mode === "edit"}
        >
          <SelectTrigger id="skill_id" aria-invalid={!!errors.skill_id}>
            <SelectValue placeholder="Select a skill..." />
          </SelectTrigger>
          <SelectContent>
            {skills.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} <span className="text-muted-foreground text-xs">({s.doc_type})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField error={errors.name}>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. Matrícula Imóvel — Golden Set 2026-Q2"
          maxLength={200}
          aria-invalid={!!errors.name}
        />
      </FormField>

      <FormField>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Brief description of this golden set's purpose..."
          rows={3}
        />
      </FormField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create Golden Set" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

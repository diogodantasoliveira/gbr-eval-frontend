"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddFieldDialogProps {
  skillId: string;
  onAdded: () => void;
}

const FIELD_TYPES = ["string", "number", "boolean", "date", "list", "nested"];
const CRITICALITIES = ["CRITICAL", "IMPORTANT", "INFORMATIVE"];

export function AddFieldDialog({ skillId, onAdded }: AddFieldDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    field_name: "",
    field_type: "string",
    criticality: "IMPORTANT",
    required: true,
    description: "",
  });

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function reset() {
    setForm({
      field_name: "",
      field_type: "string",
      criticality: "IMPORTANT",
      required: true,
      description: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add field");
        return;
      }
      toast.success(`Field "${form.field_name}" added`);
      reset();
      setOpen(false);
      onAdded();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-3.5" />
            Add Field
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Field</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="field_name">Field Name</Label>
            <Input
              id="field_name"
              value={form.field_name}
              onChange={(e) => handleChange("field_name", e.target.value)}
              placeholder="e.g. numero_matricula"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="field_type">Type</Label>
            <Select
              value={form.field_type}
              onValueChange={(v) => v != null && handleChange("field_type", v)}
            >
              <SelectTrigger id="field_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="criticality">Criticality</Label>
            <Select
              value={form.criticality}
              onValueChange={(v) => v != null && handleChange("criticality", v)}
            >
              <SelectTrigger id="criticality" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITICALITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="required"
              type="checkbox"
              checked={form.required}
              onChange={(e) => handleChange("required", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="required">Required</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

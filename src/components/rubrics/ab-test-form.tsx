"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Rubric {
  id: string;
  name: string;
}

interface GoldenSet {
  id: string;
  name: string;
}

export function AbTestForm() {
  const router = useRouter();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [goldenSets, setGoldenSets] = useState<GoldenSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rubric_a_id: "",
    rubric_b_id: "",
    golden_set_id: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/rubrics").then((r) => r.json()),
      fetch("/api/golden-sets").then((r) => r.json()),
    ])
      .then(([rubs, gs]) => {
        setRubrics(Array.isArray(rubs) ? rubs : (rubs?.data ?? []));
        setGoldenSets(Array.isArray(gs) ? gs : (gs?.data ?? []));
      })
      .catch(() => toast.error("Failed to load rubrics or golden sets"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.rubric_a_id || !form.rubric_b_id || !form.golden_set_id) {
      toast.error("All fields are required");
      return;
    }
    if (form.rubric_a_id === form.rubric_b_id) {
      toast.error("Rubric A and Rubric B must be different");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rubrics/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create A/B test");
        return;
      }

      toast.success("A/B test created");
      router.push(`/rubrics/ab-tests/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Test Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. extraction_v1 vs extraction_v2"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rubric_a_id">Rubric A</Label>
        <Select
          value={form.rubric_a_id}
          onValueChange={(v) => v != null && handleChange("rubric_a_id", v)}
        >
          <SelectTrigger id="rubric_a_id" className="w-full">
            <SelectValue placeholder="Select rubric A" />
          </SelectTrigger>
          <SelectContent>
            {rubrics.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rubric_b_id">Rubric B</Label>
        <Select
          value={form.rubric_b_id}
          onValueChange={(v) => v != null && handleChange("rubric_b_id", v)}
        >
          <SelectTrigger id="rubric_b_id" className="w-full">
            <SelectValue placeholder="Select rubric B" />
          </SelectTrigger>
          <SelectContent>
            {rubrics.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="golden_set_id">Golden Set</Label>
        <Select
          value={form.golden_set_id}
          onValueChange={(v) => v != null && handleChange("golden_set_id", v)}
        >
          <SelectTrigger id="golden_set_id" className="w-full">
            <SelectValue placeholder="Select golden set" />
          </SelectTrigger>
          <SelectContent>
            {goldenSets.map((gs) => (
              <SelectItem key={gs.id} value={gs.id}>
                {gs.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create A/B Test"}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Criterion {
  id: string;
  criterion: string;
  weight: number;
  score_anchor_low: string | null;
  score_anchor_high: string | null;
  sort_order: number;
}

interface CriteriaEditorProps {
  rubricId: string;
  initialCriteria: Criterion[];
}

export function CriteriaEditor({ rubricId, initialCriteria }: CriteriaEditorProps) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criterion[]>(
    [...initialCriteria].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCriterion, setNewCriterion] = useState({
    criterion: "",
    weight: "1.0",
    score_anchor_low: "",
    score_anchor_high: "",
  });

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  async function handleUpdate(criterion: Criterion) {
    setSaving(criterion.id);
    try {
      const res = await fetch(
        `/api/rubrics/${rubricId}/criteria/${criterion.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            criterion: criterion.criterion,
            weight: criterion.weight,
            score_anchor_low: criterion.score_anchor_low ?? "",
            score_anchor_high: criterion.score_anchor_high ?? "",
            sort_order: criterion.sort_order,
          }),
        }
      );
      if (!res.ok) {
        toast.error("Failed to update criterion");
        return;
      }
      toast.success("Criterion updated");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    setSaving(id);
    try {
      const res = await fetch(`/api/rubrics/${rubricId}/criteria/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete criterion");
        return;
      }
      setCriteria((prev) => prev.filter((c) => c.id !== id));
      toast.success("Criterion deleted");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`/api/rubrics/${rubricId}/criteria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterion: newCriterion.criterion,
          weight: parseFloat(newCriterion.weight),
          score_anchor_low: newCriterion.score_anchor_low,
          score_anchor_high: newCriterion.score_anchor_high,
          sort_order: criteria.length,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to add criterion");
        return;
      }
      const created = await res.json();
      setCriteria((prev) => [...prev, created]);
      setNewCriterion({ criterion: "", weight: "1.0", score_anchor_low: "", score_anchor_high: "" });
      toast.success("Criterion added");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  }

  function updateLocal(id: string, field: keyof Criterion, value: string | number) {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total weight: <span className="font-mono font-medium text-foreground">{totalWeight.toFixed(2)}</span>
        </p>
      </div>

      {criteria.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No criteria yet. Add one below.
        </p>
      )}

      {criteria.map((criterion, idx) => (
        <Card key={criterion.id} size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm flex-1">Criterion {idx + 1}</CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(criterion.id)}
                disabled={saving === criterion.id}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`criterion-${criterion.id}`}>Criterion</Label>
              <Textarea
                id={`criterion-${criterion.id}`}
                value={criterion.criterion}
                onChange={(e) => updateLocal(criterion.id, "criterion", e.target.value)}
                rows={2}
                placeholder="Describe what this criterion evaluates..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`weight-${criterion.id}`}>Weight</Label>
              <Input
                id={`weight-${criterion.id}`}
                type="number"
                min={0}
                step={0.1}
                value={criterion.weight}
                onChange={(e) => updateLocal(criterion.id, "weight", parseFloat(e.target.value) || 0)}
                className="w-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`anchor-low-${criterion.id}`}>Score Anchor Low (1-2)</Label>
                <Textarea
                  id={`anchor-low-${criterion.id}`}
                  value={criterion.score_anchor_low ?? ""}
                  onChange={(e) => updateLocal(criterion.id, "score_anchor_low", e.target.value)}
                  rows={2}
                  placeholder="What does a low score look like?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`anchor-high-${criterion.id}`}>Score Anchor High (4-5)</Label>
                <Textarea
                  id={`anchor-high-${criterion.id}`}
                  value={criterion.score_anchor_high ?? ""}
                  onChange={(e) => updateLocal(criterion.id, "score_anchor_high", e.target.value)}
                  rows={2}
                  placeholder="What does a high score look like?"
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleUpdate(criterion)}
              disabled={saving === criterion.id}
            >
              {saving === criterion.id ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      ))}

      <Separator />

      <form onSubmit={handleAdd} className="space-y-3">
        <h4 className="text-sm font-medium">Add Criterion</h4>

        <div className="space-y-1.5">
          <Label htmlFor="new-criterion">Criterion</Label>
          <Textarea
            id="new-criterion"
            value={newCriterion.criterion}
            onChange={(e) => setNewCriterion((p) => ({ ...p, criterion: e.target.value }))}
            rows={2}
            placeholder="Describe what this criterion evaluates..."
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-weight">Weight</Label>
          <Input
            id="new-weight"
            type="number"
            min={0}
            step={0.1}
            value={newCriterion.weight}
            onChange={(e) => setNewCriterion((p) => ({ ...p, weight: e.target.value }))}
            className="w-32"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-anchor-low">Score Anchor Low</Label>
            <Textarea
              id="new-anchor-low"
              value={newCriterion.score_anchor_low}
              onChange={(e) => setNewCriterion((p) => ({ ...p, score_anchor_low: e.target.value }))}
              rows={2}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-anchor-high">Score Anchor High</Label>
            <Textarea
              id="new-anchor-high"
              value={newCriterion.score_anchor_high}
              onChange={(e) => setNewCriterion((p) => ({ ...p, score_anchor_high: e.target.value }))}
              rows={2}
              placeholder="Optional"
            />
          </div>
        </div>

        <Button type="submit" size="sm" disabled={adding}>
          <Plus className="size-3.5" />
          {adding ? "Adding..." : "Add Criterion"}
        </Button>
      </form>
    </div>
  );
}

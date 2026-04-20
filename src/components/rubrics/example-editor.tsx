"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { safeJsonParse } from "@/lib/db";

interface Example {
  id: string;
  input_data: string;
  output_data: string;
  expected_score: number;
  reasoning: string | null;
  sort_order: number;
}

interface ExampleEditorProps {
  rubricId: string;
  initialExamples: Example[];
}

const SCORES = [1, 2, 3, 4, 5];

export function ExampleEditor({ rubricId, initialExamples }: ExampleEditorProps) {
  const router = useRouter();
  const [examples, setExamples] = useState<Example[]>(
    [...initialExamples].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newExample, setNewExample] = useState({
    input_data: "{}",
    output_data: "{}",
    expected_score: "3",
    reasoning: "",
  });
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validateJson(value: string, key: string): boolean {
    try {
      JSON.parse(value);
      setJsonErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
      return true;
    } catch {
      setJsonErrors((prev) => ({ ...prev, [key]: "Invalid JSON" }));
      return false;
    }
  }

  function updateLocal(id: string, field: keyof Example, value: string | number) {
    setExamples((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  }

  async function handleUpdate(example: Example) {
    const inputKey = `input-${example.id}`;
    const outputKey = `output-${example.id}`;
    if (!validateJson(example.input_data, inputKey)) return;
    if (!validateJson(example.output_data, outputKey)) return;

    setSaving(example.id);
    try {
      const res = await fetch(
        `/api/rubrics/${rubricId}/examples/${example.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_data: safeJsonParse(example.input_data, {}),
            output_data: safeJsonParse(example.output_data, {}),
            expected_score: example.expected_score,
            reasoning: example.reasoning ?? "",
            sort_order: example.sort_order,
          }),
        }
      );
      if (!res.ok) {
        toast.error("Failed to update example");
        return;
      }
      toast.success("Example updated");
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
      const res = await fetch(`/api/rubrics/${rubricId}/examples/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete example");
        return;
      }
      setExamples((prev) => prev.filter((ex) => ex.id !== id));
      toast.success("Example deleted");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!validateJson(newExample.input_data, "new-input")) return;
    if (!validateJson(newExample.output_data, "new-output")) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/rubrics/${rubricId}/examples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_data: safeJsonParse(newExample.input_data, {}),
          output_data: safeJsonParse(newExample.output_data, {}),
          expected_score: parseInt(newExample.expected_score, 10),
          reasoning: newExample.reasoning,
          sort_order: examples.length,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to add example");
        return;
      }
      const created = await res.json();
      setExamples((prev) => [...prev, created]);
      setNewExample({ input_data: "{}", output_data: "{}", expected_score: "3", reasoning: "" });
      toast.success("Example added");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      {examples.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No examples yet. Add one below.
        </p>
      )}

      {examples.map((example, idx) => {
        const isCollapsed = collapsed.has(example.id);
        return (
          <Card key={example.id} size="sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCollapse(example.id)}
                  className="flex items-center gap-1 flex-1 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <CardTitle className="text-sm">
                    Example {idx + 1} — score {example.expected_score}
                  </CardTitle>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(example.id)}
                  disabled={saving === example.id}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`score-${example.id}`}>Expected Score</Label>
                  <Select
                    value={String(example.expected_score)}
                    onValueChange={(v) => v != null && updateLocal(example.id, "expected_score", parseInt(v, 10))}
                  >
                    <SelectTrigger id={`score-${example.id}`} className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCORES.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`input-${example.id}`}>Input Data (JSON)</Label>
                    <Textarea
                      id={`input-${example.id}`}
                      value={example.input_data}
                      onChange={(e) => {
                        updateLocal(example.id, "input_data", e.target.value);
                        validateJson(e.target.value, `input-${example.id}`);
                      }}
                      rows={5}
                      className="font-mono text-xs"
                    />
                    {jsonErrors[`input-${example.id}`] && (
                      <p className="text-xs text-destructive">{jsonErrors[`input-${example.id}`]}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`output-${example.id}`}>Output Data (JSON)</Label>
                    <Textarea
                      id={`output-${example.id}`}
                      value={example.output_data}
                      onChange={(e) => {
                        updateLocal(example.id, "output_data", e.target.value);
                        validateJson(e.target.value, `output-${example.id}`);
                      }}
                      rows={5}
                      className="font-mono text-xs"
                    />
                    {jsonErrors[`output-${example.id}`] && (
                      <p className="text-xs text-destructive">{jsonErrors[`output-${example.id}`]}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`reasoning-${example.id}`}>Reasoning</Label>
                  <Textarea
                    id={`reasoning-${example.id}`}
                    value={example.reasoning ?? ""}
                    onChange={(e) => updateLocal(example.id, "reasoning", e.target.value)}
                    rows={3}
                    placeholder="Why does this example deserve that score?"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdate(example)}
                  disabled={saving === example.id}
                >
                  {saving === example.id ? "Saving..." : "Save"}
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Separator />

      <form onSubmit={handleAdd} className="space-y-3">
        <h4 className="text-sm font-medium">Add Example</h4>

        <div className="space-y-1.5">
          <Label htmlFor="new-score">Expected Score</Label>
          <Select
            value={newExample.expected_score}
            onValueChange={(v) => v != null && setNewExample((p) => ({ ...p, expected_score: v }))}
          >
            <SelectTrigger id="new-score" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCORES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-input">Input Data (JSON)</Label>
            <Textarea
              id="new-input"
              value={newExample.input_data}
              onChange={(e) => {
                setNewExample((p) => ({ ...p, input_data: e.target.value }));
                validateJson(e.target.value, "new-input");
              }}
              rows={5}
              className="font-mono text-xs"
            />
            {jsonErrors["new-input"] && (
              <p className="text-xs text-destructive">{jsonErrors["new-input"]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-output">Output Data (JSON)</Label>
            <Textarea
              id="new-output"
              value={newExample.output_data}
              onChange={(e) => {
                setNewExample((p) => ({ ...p, output_data: e.target.value }));
                validateJson(e.target.value, "new-output");
              }}
              rows={5}
              className="font-mono text-xs"
            />
            {jsonErrors["new-output"] && (
              <p className="text-xs text-destructive">{jsonErrors["new-output"]}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-reasoning">Reasoning</Label>
          <Textarea
            id="new-reasoning"
            value={newExample.reasoning}
            onChange={(e) => setNewExample((p) => ({ ...p, reasoning: e.target.value }))}
            rows={3}
            placeholder="Why does this example deserve that score?"
          />
        </div>

        <Button type="submit" size="sm" disabled={adding}>
          <Plus className="size-3.5" />
          {adding ? "Adding..." : "Add Example"}
        </Button>
      </form>
    </div>
  );
}

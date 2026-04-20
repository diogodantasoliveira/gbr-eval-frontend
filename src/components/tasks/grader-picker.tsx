"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { GraderType } from "@/lib/validations/task";

export interface GraderEntry {
  id: string;
  grader_type: GraderType;
  field: string;
  weight: number;
  required: boolean;
  config: Record<string, unknown>;
  model_role: string;
  sort_order: number;
}

interface ConventionRule {
  pattern: string;
  type: "required" | "forbidden";
  description: string;
}

const GRADER_TYPES: Array<{ value: GraderType; label: string; group: string }> = [
  { value: "exact_match", label: "Exact Match", group: "Product" },
  { value: "numeric_range", label: "Numeric Range", group: "Product" },
  { value: "numeric_tolerance", label: "Numeric Tolerance", group: "Product" },
  { value: "regex_match", label: "Regex Match", group: "Product" },
  { value: "field_not_empty", label: "Field Not Empty", group: "Product" },
  { value: "set_membership", label: "Set Membership", group: "Product" },
  { value: "string_contains", label: "String Contains", group: "Product" },
  { value: "field_f1", label: "Field F1", group: "Product" },
  { value: "llm_judge", label: "LLM Judge", group: "Product" },
  { value: "pattern_required", label: "Pattern Required", group: "Engineering" },
  { value: "pattern_forbidden", label: "Pattern Forbidden", group: "Engineering" },
  { value: "convention_check", label: "Convention Check", group: "Engineering" },
];

interface GraderConfigFormProps {
  type: GraderType;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  rubrics: Array<{ id: string; name: string }>;
}

function GraderConfigForm({ type, config, onChange, rubrics }: GraderConfigFormProps) {
  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  if (type === "numeric_range") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            step="any"
            value={(config.min as number) ?? ""}
            onChange={(e) => set("min", e.target.value === "" ? undefined : parseFloat(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            step="any"
            value={(config.max as number) ?? ""}
            onChange={(e) => set("max", e.target.value === "" ? undefined : parseFloat(e.target.value))}
            placeholder="1"
          />
        </div>
      </div>
    );
  }

  if (type === "numeric_tolerance") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Tolerance</Label>
        <Input
          type="number"
          step="any"
          min="0"
          value={(config.tolerance as number) ?? ""}
          onChange={(e) => set("tolerance", parseFloat(e.target.value) || 0)}
          placeholder="0.01"
        />
      </div>
    );
  }

  if (type === "regex_match") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Pattern</Label>
        <Input
          value={(config.pattern as string) ?? ""}
          onChange={(e) => set("pattern", e.target.value)}
          placeholder="^\d{3}\.\d{3}\.\d{3}-\d{2}$"
          className="font-mono text-xs"
        />
      </div>
    );
  }

  if (type === "set_membership") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Valid values (comma-separated)</Label>
        <Input
          value={
            Array.isArray(config.valid_values)
              ? (config.valid_values as string[]).join(", ")
              : ""
          }
          onChange={(e) =>
            set(
              "valid_values",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="value1, value2, value3"
        />
      </div>
    );
  }

  if (type === "string_contains") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Substring</Label>
        <Input
          value={(config.substring as string) ?? ""}
          onChange={(e) => set("substring", e.target.value)}
          placeholder="expected text"
        />
      </div>
    );
  }

  if (type === "llm_judge") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Rubric</Label>
          <Select
            value={(config.rubric_id as string) ?? ""}
            onValueChange={(v) => set("rubric_id", v ?? "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rubric" />
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
        <div className="space-y-1">
          <Label className="text-xs">Model</Label>
          <Input
            value={(config.model as string) ?? "claude-sonnet-4-5-20250514"}
            onChange={(e) => set("model", e.target.value)}
            placeholder="claude-sonnet-4-5-20250514"
          />
        </div>
      </div>
    );
  }

  if (type === "pattern_required" || type === "pattern_forbidden") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Pattern (regex)</Label>
          <Input
            value={(config.pattern as string) ?? ""}
            onChange={(e) => set("pattern", e.target.value)}
            placeholder={type === "pattern_required" ? "tenant_id\\s*=" : "hardcoded_secret"}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">File key</Label>
          <Input
            value={(config.file_key as string) ?? "content"}
            onChange={(e) => set("file_key", e.target.value || "content")}
            placeholder="content"
            className="font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  if (type === "convention_check") {
    const rules = (Array.isArray(config.rules) ? config.rules : []) as ConventionRule[];
    function setRules(next: ConventionRule[]) {
      onChange({ ...config, rules: next });
    }
    function updateRule(idx: number, patch: Partial<ConventionRule>) {
      const next = [...rules];
      next[idx] = { ...next[idx], ...patch };
      setRules(next);
    }
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">File key</Label>
          <Input
            value={(config.file_key as string) ?? "content"}
            onChange={(e) => set("file_key", e.target.value || "content")}
            placeholder="content"
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Convention Rules</Label>
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded border border-border p-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={rule.pattern}
                  onChange={(e) => updateRule(idx, { pattern: e.target.value })}
                  placeholder="regex pattern"
                  className="font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Select
                    value={rule.type}
                    onValueChange={(v) => updateRule(idx, { type: (v ?? "required") as "required" | "forbidden" })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="forbidden">Forbidden</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={rule.description}
                    onChange={(e) => updateRule(idx, { description: e.target.value })}
                    placeholder="description (optional)"
                    className="text-xs flex-1"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="text-destructive mt-1"
                onClick={() => setRules(rules.filter((_, i) => i !== idx))}
              >
                x
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="xs"
            type="button"
            onClick={() => setRules([...rules, { pattern: "", type: "required", description: "" }])}
          >
            + Add Rule
          </Button>
        </div>
      </div>
    );
  }

  // exact_match, field_not_empty, field_f1 — no extra config
  return (
    <p className="text-xs text-muted-foreground italic">No additional configuration needed.</p>
  );
}

interface GraderRowProps {
  grader: GraderEntry;
  index: number;
  rubrics: Array<{ id: string; name: string }>;
  onChange: (updated: GraderEntry) => void;
  onRemove: () => void;
}

function GraderRow({ grader, index, rubrics, onChange, onRemove }: GraderRowProps) {
  function update(patch: Partial<GraderEntry>) {
    onChange({ ...grader, ...patch });
  }

  const needsField = grader.grader_type !== "field_f1";

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Grader #{index + 1}</span>
        <Button variant="ghost" size="xs" onClick={onRemove} className="text-destructive">
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={grader.grader_type}
            onValueChange={(v) => update({ grader_type: (v ?? "exact_match") as GraderType, config: {} })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRADER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsField && (
          <div className="space-y-1">
            <Label className="text-xs">Field</Label>
            <Input
              value={grader.field}
              onChange={(e) => update({ field: e.target.value })}
              placeholder="cpf_proprietario"
              className="font-mono text-xs"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Weight</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={grader.weight}
            onChange={(e) => update({ weight: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Model Role</Label>
          <Input
            value={grader.model_role}
            onChange={(e) => update({ model_role: e.target.value })}
            placeholder="e.g. grader"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={grader.required}
              onChange={(e) => update({ required: e.target.checked })}
              className="rounded"
            />
            Required
          </label>
        </div>
      </div>

      <GraderConfigForm
        type={grader.grader_type}
        config={grader.config}
        onChange={(config) => update({ config })}
        rubrics={rubrics}
      />
    </div>
  );
}

interface GraderPickerProps {
  graders: GraderEntry[];
  onChange: (graders: GraderEntry[]) => void;
}

export function GraderPicker({ graders, onChange }: GraderPickerProps) {
  const [rubrics, setRubrics] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/rubrics")
      .then((r) => r.json())
      .then((json) => {
        setRubrics(Array.isArray(json) ? json : (json?.data ?? []));
      })
      .catch((err) => {
        console.warn("Failed to load rubrics:", err);
      });
  }, []);

  function addGrader() {
    const next: GraderEntry = {
      id: crypto.randomUUID(),
      grader_type: "exact_match",
      field: "",
      weight: 1.0,
      required: false,
      config: {},
      model_role: "",
      sort_order: graders.length,
    };
    onChange([...graders, next]);
  }

  function updateGrader(index: number, updated: GraderEntry) {
    const next = [...graders];
    next[index] = { ...updated, sort_order: index };
    onChange(next);
  }

  function removeGrader(index: number) {
    onChange(graders.filter((_, i) => i !== index).map((g, i) => ({ ...g, sort_order: i })));
  }

  return (
    <div className="space-y-4">
      {graders.map((g, idx) => (
        <GraderRow
          key={g.id}
          grader={g}
          index={idx}
          rubrics={rubrics}
          onChange={(updated) => updateGrader(idx, updated)}
          onRemove={() => removeGrader(idx)}
        />
      ))}

      <Button variant="outline" size="sm" onClick={addGrader} type="button">
        + Add Grader
      </Button>
    </div>
  );
}

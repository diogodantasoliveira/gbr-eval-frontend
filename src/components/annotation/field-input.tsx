"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillField {
  id: string;
  field_name: string;
  field_type: string;
  criticality: string;
  weight: number;
  required: number;
  validation_pattern: string | null;
  description: string | null;
  sort_order: number;
}

const criticalityConfig = {
  CRITICAL: {
    border: "border-l-red-500",
    badge: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-950",
    label: "CRITICAL",
  },
  IMPORTANT: {
    border: "border-l-amber-500",
    badge: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950",
    label: "IMPORTANT",
  },
  INFORMATIVE: {
    border: "border-l-blue-500",
    badge: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950",
    label: "INFORMATIVE",
  },
} as const;

interface FieldInputProps {
  field: SkillField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const cfg = criticalityConfig[field.criticality as keyof typeof criticalityConfig] ?? criticalityConfig.INFORMATIVE;

  function renderInput() {
    switch (field.field_type) {
      case "boolean": {
        const checked = Boolean(value);
        return (
          <div className="flex items-center gap-2 h-9">
            <input
              type="checkbox"
              id={`field-${field.id}`}
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="size-4 rounded border-border"
            />
            <label htmlFor={`field-${field.id}`} className="text-sm text-muted-foreground select-none">
              {checked ? "Yes" : "No"}
            </label>
          </div>
        );
      }

      case "number": {
        return (
          <Input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            placeholder={field.validation_pattern ?? "0"}
            className="max-w-[200px]"
          />
        );
      }

      case "date": {
        return (
          <Input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="dd/mm/yyyy"
            pattern="\d{2}/\d{2}/\d{4}"
            className="max-w-[160px] font-mono"
          />
        );
      }

      case "list": {
        const items = Array.isArray(value) ? value as string[] : [];
        return (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={typeof item === "string" ? item : String(item)}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = e.target.value;
                    onChange(next);
                  }}
                  className="flex-1"
                  placeholder={`Item ${idx + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange([...items, ""])}
            >
              <Plus className="size-3.5 mr-1.5" />
              Add item
            </Button>
          </div>
        );
      }

      case "nested": {
        const obj = (value && typeof value === "object" && !Array.isArray(value))
          ? value as Record<string, string>
          : {};
        const entries = Object.entries(obj);
        return (
          <div className="space-y-2">
            {entries.map(([k, v], idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={k}
                  onChange={(e) => {
                    const next: Record<string, string> = {};
                    entries.forEach(([ek, ev], i) => {
                      next[i === idx ? e.target.value : ek] = ev;
                    });
                    onChange(next);
                  }}
                  placeholder="key"
                  className="w-[140px] font-mono text-sm"
                />
                <span className="text-muted-foreground">:</span>
                <Input
                  value={typeof v === "string" ? v : String(v)}
                  onChange={(e) => {
                    const next = { ...obj, [k]: e.target.value };
                    onChange(next);
                  }}
                  placeholder="value"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const next = { ...obj };
                    delete next[k];
                    onChange(next);
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...obj, "": "" })}
            >
              <Plus className="size-3.5 mr-1.5" />
              Add pair
            </Button>
          </div>
        );
      }

      default: {
        // string
        return (
          <Input
            value={typeof value === "string" ? value : (value === null || value === undefined ? "" : String(value))}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.validation_pattern ?? `Enter ${field.field_name}`}
          />
        );
      }
    }
  }

  return (
    <div className={cn("pl-3 border-l-2 py-1", cfg.border)}>
      <div className="flex items-center gap-2 mb-1.5">
        <Label className="text-sm font-medium">{field.field_name}</Label>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.badge)}>
          {cfg.label}
        </Badge>
        {field.required === 1 && (
          <span className="text-[10px] text-muted-foreground">required</span>
        )}
      </div>
      {field.description && (
        <p className="text-xs text-muted-foreground mb-1.5">{field.description}</p>
      )}
      {renderInput()}
      {field.validation_pattern && field.field_type === "string" && (
        <p className="mt-1 text-[10px] text-muted-foreground font-mono">
          pattern: {field.validation_pattern}
        </p>
      )}
    </div>
  );
}

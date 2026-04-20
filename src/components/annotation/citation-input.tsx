"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationValue {
  page?: number | string;
  excerpt?: string;
}

interface CitationInputProps {
  fieldName: string;
  value: CitationValue;
  onChange: (value: CitationValue) => void;
}

export function CitationInput({ fieldName, value, onChange }: CitationInputProps) {
  const [open, setOpen] = useState(false);

  const hasData = (value.page !== undefined && value.page !== "") || (value.excerpt && value.excerpt.trim());

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          hasData ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Citation
        {hasData && <span className="text-xs">(p.{value.page})</span>}
      </button>

      {open && (
        <div className="mt-2 ml-4 space-y-2 rounded-md border border-border p-3 bg-muted/30">
          <div className="space-y-1">
            <Label htmlFor={`${fieldName}-page`} className="text-xs">Page</Label>
            <Input
              id={`${fieldName}-page`}
              type="number"
              value={value.page ?? ""}
              onChange={(e) =>
                onChange({ ...value, page: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="1"
              className="h-7 text-sm w-24"
              min={1}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fieldName}-excerpt`} className="text-xs">Excerpt</Label>
            <Textarea
              id={`${fieldName}-excerpt`}
              value={value.excerpt ?? ""}
              onChange={(e) => onChange({ ...value, excerpt: e.target.value })}
              placeholder="Copy the relevant text from the document..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

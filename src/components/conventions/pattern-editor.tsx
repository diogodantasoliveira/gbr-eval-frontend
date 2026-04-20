"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PatternEditorProps {
  positiveExample: string;
  negativeExample: string;
  onPositiveChange?: (value: string) => void;
  onNegativeChange?: (value: string) => void;
  readOnly?: boolean;
}

const noop = () => {};

export function PatternEditor({
  positiveExample,
  negativeExample,
  onPositiveChange = noop,
  onNegativeChange = noop,
  readOnly = false,
}: PatternEditorProps) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Examples</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Provide concrete code examples to illustrate the convention.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Correct pattern */}
        <div className="space-y-1.5">
          <Label htmlFor="positive_example" className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-green-500" />
            Correct Pattern
          </Label>
          <Textarea
            id="positive_example"
            value={positiveExample}
            onChange={(e) => onPositiveChange(e.target.value)}
            placeholder="Show the correct way to write this code..."
            rows={5}
            readOnly={readOnly}
            className="font-mono text-xs border-green-500/40 focus-visible:border-green-500/70 dark:border-green-500/30 dark:focus-visible:border-green-500/50"
          />
        </div>

        {/* Anti-pattern */}
        <div className="space-y-1.5">
          <Label htmlFor="negative_example" className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-red-500" />
            Anti-Pattern
          </Label>
          <Textarea
            id="negative_example"
            value={negativeExample}
            onChange={(e) => onNegativeChange(e.target.value)}
            placeholder="Show the incorrect way that should be avoided..."
            rows={5}
            readOnly={readOnly}
            className="font-mono text-xs border-red-500/40 focus-visible:border-red-500/70 dark:border-red-500/30 dark:focus-visible:border-red-500/50"
          />
        </div>
      </div>
    </div>
  );
}

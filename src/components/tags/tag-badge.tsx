"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tagColors: Record<string, string> = {
  seed: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950",
  regression: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-950",
  incident: "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-950",
  edge_case: "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:bg-purple-950",
  hitl: "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950",
};

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  const colorClass = tagColors[tag] ?? "border-gray-300 text-gray-600 bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-800";

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium gap-1", colorClass, className)}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded hover:opacity-70 focus:outline-none"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </Badge>
  );
}

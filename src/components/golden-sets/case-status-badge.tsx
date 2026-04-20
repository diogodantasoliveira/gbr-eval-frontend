"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CaseStatus = "draft" | "annotated" | "reviewed" | "approved";

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-gray-300 text-gray-600 bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-800",
  },
  annotated: {
    label: "Annotated",
    className: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-950",
  },
  reviewed: {
    label: "Reviewed",
    className: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950",
  },
  approved: {
    label: "Approved",
    className: "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950",
  },
};

interface CaseStatusBadgeProps {
  status: string;
  className?: string;
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  const config = statusConfig[status as CaseStatus] ?? {
    label: status,
    className: "border-gray-300 text-gray-600 bg-gray-100",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

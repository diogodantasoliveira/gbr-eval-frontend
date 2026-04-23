"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SortDirection } from "@/hooks/use-sortable"

interface SortableHeadProps {
  children: React.ReactNode
  active: boolean
  direction: SortDirection | null
  onClick: () => void
  className?: string
}

export function SortableHead({ children, active, direction, onClick, className }: SortableHeadProps) {
  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={onClick}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && direction === "asc" ? (
          <ArrowUp className="size-3" />
        ) : active && direction === "desc" ? (
          <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </span>
    </TableHead>
  )
}

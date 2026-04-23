"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <div className={cn("flex items-center justify-between pt-4", className)}>
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft className="size-3.5" />
          <span className="sr-only">First page</span>
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-3.5" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          <ChevronRight className="size-3.5" />
          <span className="sr-only">Next page</span>
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(pageCount)}
          disabled={page >= pageCount}
        >
          <ChevronsRight className="size-3.5" />
          <span className="sr-only">Last page</span>
        </Button>
      </div>
    </div>
  )
}

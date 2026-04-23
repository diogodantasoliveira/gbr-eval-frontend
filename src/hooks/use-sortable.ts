"use client"

import { useState, useMemo } from "react"

export type SortDirection = "asc" | "desc"
export type SortConfig<K extends string = string> = { key: K; direction: SortDirection } | null

export function useSortable<T, K extends string = string>(
  items: T[],
  accessors: Record<K, (item: T) => string | number | null>
) {
  const [sort, setSort] = useState<SortConfig<K>>(null)

  function onSort(key: K) {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" }
        return null // third click clears sort
      }
      return { key, direction: "asc" }
    })
  }

  const sorted = useMemo(() => {
    if (!sort) return items
    const accessor = accessors[sort.key]
    return [...items].sort((a, b) => {
      const va = accessor(a)
      const vb = accessor(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb))
      return sort.direction === "asc" ? cmp : -cmp
    })
  }, [items, sort, accessors])

  return { sorted, sort, onSort }
}

"use client"

import { useState, useMemo, useEffect } from "react"

const DEFAULT_PAGE_SIZE = 20

export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [items.length])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  function onPageChange(newPage: number) {
    setPage(Math.max(1, Math.min(newPage, pageCount)))
  }

  return { page, pageCount, paginatedItems, onPageChange, totalItems: items.length }
}

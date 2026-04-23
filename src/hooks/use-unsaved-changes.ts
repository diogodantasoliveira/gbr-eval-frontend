"use client"

import { useEffect, useCallback, useRef } from "react"

export function useUnsavedChanges(isDirty: boolean) {
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (dirtyRef.current) {
      e.preventDefault()
    }
  }, [])

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [handleBeforeUnload])
}

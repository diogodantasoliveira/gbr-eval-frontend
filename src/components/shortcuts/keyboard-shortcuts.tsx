"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShortcutsHelp } from "./shortcuts-help";

const GO_ROUTES: Record<string, string> = {
  s: "/skills",
  g: "/golden-sets",
  t: "/tasks",
  r: "/rubrics",
  u: "/runs",
  c: "/contracts",
  v: "/conventions",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  // Track "g" prefix for two-key sequences
  const pendingG = useRef(false);
  const pendingGTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K — focus search (works even when input is focused)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("gbr:focus-search"));
        return;
      }

      // All other shortcuts skip when an input is focused
      if (isInputFocused()) return;

      // "?" — show help
      if (e.key === "?") {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // "g <letter>" — navigate
      if (pendingG.current) {
        const route = GO_ROUTES[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        pendingG.current = false;
        if (pendingGTimer.current) {
          clearTimeout(pendingGTimer.current);
          pendingGTimer.current = null;
        }
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingG.current = true;
        // Reset pending state after 1 second if no follow-up key
        pendingGTimer.current = setTimeout(() => {
          pendingG.current = false;
          pendingGTimer.current = null;
        }, 1000);
        return;
      }
    }

    function onShowHelp() {
      setShowHelp(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("gbr:show-shortcuts", onShowHelp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("gbr:show-shortcuts", onShowHelp);
      if (pendingGTimer.current) clearTimeout(pendingGTimer.current);
    };
  }, [router]);

  return (
    <ShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
  );
}

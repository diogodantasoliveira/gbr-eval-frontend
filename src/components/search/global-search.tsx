"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Database, ListChecks, ScrollText, BarChart3, FileJson, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResults {
  skills: { id: string; name: string; doc_type: string; description: string | null }[];
  golden_sets: { id: string; name: string; description: string | null }[];
  tasks: { id: string; task_id: string; description: string | null; category: string }[];
  rubrics: { id: string; name: string; rubric_text: string; category: string }[];
  contracts: { id: string; service_name: string; endpoint: string; method: string }[];
  conventions: { id: string; name: string; description: string | null; category: string }[];
}

const EMPTY: SearchResults = {
  skills: [],
  golden_sets: [],
  tasks: [],
  rubrics: [],
  contracts: [],
  conventions: [],
};

interface ResultGroup<T> {
  key: keyof SearchResults;
  label: string;
  icon: React.ReactNode;
  items: T[];
  getHref: (item: T) => string;
  getLabel: (item: T) => string;
  getSub: (item: T) => string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose focus function for keyboard shortcuts via custom event
  useEffect(() => {
    function onFocusSearch() {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("gbr:focus-search", onFocusSearch);
    return () => window.removeEventListener("gbr:focus-search", onFocusSearch);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(EMPTY);
      setOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data: SearchResults) => {
          setResults(data);
          setOpen(true);
          setActiveIdx(-1);
        })
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Build flat list of all results for keyboard nav
  const flatResults: { href: string; label: string }[] = [];

  const groups: ResultGroup<unknown>[] = [
    {
      key: "skills",
      label: "Skills",
      icon: <BookOpen className="size-3" />,
      items: results.skills,
      getHref: (item) => `/skills/${(item as { id: string }).id}`,
      getLabel: (item) => (item as { name: string }).name,
      getSub: (item) => (item as { doc_type: string }).doc_type,
    },
    {
      key: "golden_sets",
      label: "Golden Sets",
      icon: <Database className="size-3" />,
      items: results.golden_sets,
      getHref: (item) => `/golden-sets/${(item as { id: string }).id}`,
      getLabel: (item) => (item as { name: string }).name,
      getSub: (item) => (item as { description: string | null }).description ?? "",
    },
    {
      key: "tasks",
      label: "Tasks",
      icon: <ListChecks className="size-3" />,
      items: results.tasks,
      getHref: (item) => `/tasks/${(item as { id: string }).id}`,
      getLabel: (item) => (item as { task_id: string }).task_id,
      getSub: (item) => (item as { category: string }).category,
    },
    {
      key: "rubrics",
      label: "Rubrics",
      icon: <ScrollText className="size-3" />,
      items: results.rubrics,
      getHref: (item) => `/rubrics/${(item as { id: string }).id}`,
      getLabel: (item) => (item as { name: string }).name,
      getSub: (item) => (item as { category: string }).category,
    },
    {
      key: "contracts",
      label: "Contracts",
      icon: <FileJson className="size-3" />,
      items: results.contracts,
      getHref: (item) => `/contracts/${(item as { id: string }).id}`,
      getLabel: (item) => (item as { service_name: string }).service_name,
      getSub: (item) => (item as { endpoint: string }).endpoint,
    },
    {
      key: "conventions",
      label: "Conventions",
      icon: <Shield className="size-3" />,
      items: results.conventions,
      getHref: (item) => `/conventions/${(item as { id: string }).id}`,
      getLabel: (item) => (item as { name: string }).name,
      getSub: (item) => (item as { category: string }).category,
    },
  ];

  for (const g of groups) {
    for (const item of g.items) {
      flatResults.push({ href: g.getHref(item), label: g.getLabel(item) });
    }
  }

  const totalFlat = flatResults.length;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalFlat - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const item = flatResults[activeIdx];
      if (item) {
        setOpen(false);
        setQuery("");
        router.push(item.href);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  const hasAny = groups.some((g) => g.items.length > 0);
  let flatIdx = 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search… (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-7 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none",
            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
            "transition-colors"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}
          {!loading && !hasAny && (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {!loading && hasAny && (
            <div className="max-h-80 overflow-y-auto py-1">
              {groups.map((group) => {
                if (group.items.length === 0) return null;
                return (
                  <div key={group.key}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.icon}
                      {group.label}
                    </div>
                    {group.items.map((item) => {
                      const href = group.getHref(item);
                      const label = group.getLabel(item);
                      const sub = group.getSub(item);
                      const isActive = flatIdx === activeIdx;
                      const currentIdx = flatIdx++;
                      return (
                        <button
                          key={href}
                          type="button"
                          className={cn(
                            "w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-muted/60 transition-colors",
                            isActive && "bg-muted/60"
                          )}
                          onMouseEnter={() => setActiveIdx(currentIdx)}
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                            router.push(href);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{label}</p>
                            {sub && (
                              <p className="text-xs text-muted-foreground truncate">{sub}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

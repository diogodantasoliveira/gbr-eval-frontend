"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Plus, FileText, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ConventionList } from "@/components/conventions/convention-list";
import { ImportClaudeMdDialog } from "@/components/conventions/import-claude-md-dialog";
import type { ConventionRow } from "@/components/conventions/convention-list";

export default function ConventionsPage() {
  const [rules, setRules] = useState<ConventionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetch("/api/conventions")
      .then((r) => r.json())
      .then((json) => setRules(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [importOpen]); // refetch after import dialog closes

  return (
    <div>
      <PageHeader
        title="Convention Rules"
        description="Engineering coding conventions that Claude Code must follow"
      >
        <Button
          variant="outline"
          render={<Link href="/conventions/coverage" />}
        >
          <LayoutGrid className="size-4" />
          Coverage
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <FileText className="size-4" />
          Seed from CLAUDE.md
        </Button>
        <Button render={<Link href="/conventions/new" />}>
          <Plus className="size-4" />
          New Rule
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Loading...</p>
      ) : (
        <ConventionList initialData={rules} />
      )}

      <ImportClaudeMdDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

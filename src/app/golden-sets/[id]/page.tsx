import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "@/components/golden-sets/case-status-badge";
import { CaseList } from "@/components/golden-sets/case-list";
import { db } from "@/db";
import { golden_sets, golden_set_cases, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { Pencil, Download } from "lucide-react";
import { ImportDialog } from "@/components/golden-sets/import-dialog";

export const dynamic = "force-dynamic";

export default async function GoldenSetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const gs = db
    .select({
      id: golden_sets.id,
      name: golden_sets.name,
      description: golden_sets.description,
      status: golden_sets.status,
      skill_id: golden_sets.skill_id,
      created_by: golden_sets.created_by,
      created_at: golden_sets.created_at,
      updated_at: golden_sets.updated_at,
      version: golden_sets.version,
      skill_name: skills.name,
      skill_doc_type: skills.doc_type,
    })
    .from(golden_sets)
    .leftJoin(skills, eq(golden_sets.skill_id, skills.id))
    .where(eq(golden_sets.id, id))
    .get();

  if (!gs) notFound();

  const rawCases = db
    .select()
    .from(golden_set_cases)
    .where(eq(golden_set_cases.golden_set_id, id))
    .all();

  const cases = rawCases.map((c) => ({
    id: c.id,
    case_number: c.case_number,
    status: c.status,
    tags: safeJsonParse<string[]>(c.tags ?? "[]", []),
    annotator: c.annotator,
    created_at: c.created_at,
  }));

  return (
    <div>
      <PageHeader title={gs.name} description={gs.description ?? undefined}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/golden-sets/${id}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" render={<a href={`/api/golden-sets/${id}/export`} download />}>
            <Download className="size-3.5" />
            Export
          </Button>
          <ImportDialog goldenSetId={id} />
        </div>
      </PageHeader>

      {/* Metadata */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <CaseStatusBadge status={gs.status} />
        {gs.skill_name && (
          <span>
            Skill: <span className="text-foreground font-medium">{gs.skill_name}</span>
            {gs.skill_doc_type && ` (${gs.skill_doc_type})`}
          </span>
        )}
        <span>
          Created: {new Date(gs.created_at).toLocaleDateString("pt-BR")}
        </span>
        <span>v{gs.version}</span>
      </div>

      {/* Cases */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Cases</h2>
        <CaseList goldenSetId={id} cases={cases} />
      </div>
    </div>
  );
}

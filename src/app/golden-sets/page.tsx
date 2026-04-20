import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { GoldenSetList } from "@/components/golden-sets/golden-set-list";
import { db } from "@/db";
import { golden_sets, golden_set_cases, skills } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GoldenSetsPage() {
  const rows = db
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
      case_count: sql<number>`count(${golden_set_cases.id})`.as("case_count"),
    })
    .from(golden_sets)
    .leftJoin(skills, eq(golden_sets.skill_id, skills.id))
    .leftJoin(golden_set_cases, eq(golden_set_cases.golden_set_id, golden_sets.id))
    .groupBy(golden_sets.id)
    .all();

  return (
    <div>
      <PageHeader
        title="Golden Sets"
        description="Annotated reference sets for evaluation"
      >
        <Button render={<Link href="/golden-sets/new" />}>
          <Plus className="size-4" />
          New Golden Set
        </Button>
      </PageHeader>

      <GoldenSetList initialData={rows} />
    </div>
  );
}

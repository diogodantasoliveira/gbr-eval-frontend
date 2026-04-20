import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/header";
import { AnnotationForm } from "@/components/annotation/annotation-form";
import { db } from "@/db";
import { golden_sets } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function NewCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const gs = db
    .select()
    .from(golden_sets)
    .where(eq(golden_sets.id, id))
    .get();

  if (!gs) notFound();

  return (
    <div>
      <PageHeader
        title="New Case"
        description={`Adding a case to: ${gs.name}`}
      />
      <AnnotationForm
        goldenSetId={id}
        skillId={gs.skill_id}
        mode="create"
      />
    </div>
  );
}

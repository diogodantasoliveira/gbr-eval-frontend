import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/header";
import { GoldenSetForm } from "@/components/golden-sets/golden-set-form";
import { db } from "@/db";
import { golden_sets } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EditGoldenSetPage({
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
        title="Edit Golden Set"
        description={`Editing: ${gs.name}`}
      />
      <GoldenSetForm
        mode="edit"
        initialData={{
          id: gs.id,
          name: gs.name,
          description: gs.description ?? null,
          skill_id: gs.skill_id,
        }}
      />
    </div>
  );
}

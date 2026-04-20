import { notFound } from "next/navigation";
import { db } from "@/db";
import { convention_rules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { ConventionEditForm } from "@/components/conventions/convention-edit-form";

export const dynamic = "force-dynamic";

export default async function EditConventionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rule = db
    .select()
    .from(convention_rules)
    .where(eq(convention_rules.id, id))
    .get();

  if (!rule) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit: ${rule.name}`}
        description="Update convention rule definition and examples"
      />
      <ConventionEditForm
        conventionId={id}
        initialData={{
          name: rule.name,
          category: rule.category,
          severity: rule.severity,
          detection_type: rule.detection_type,
          description: rule.description ?? "",
          detection_pattern: rule.detection_pattern ?? "",
          source: rule.source ?? "",
          positive_example: rule.positive_example ?? "",
          negative_example: rule.negative_example ?? "",
        }}
      />
    </div>
  );
}

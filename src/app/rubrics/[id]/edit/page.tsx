import { notFound } from "next/navigation";
import { db } from "@/db";
import { rubrics, skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { RubricForm } from "@/components/rubrics/rubric-form";

export const dynamic = "force-dynamic";

export default async function EditRubricPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
  if (!rubric) notFound();

  const allSkills = db.select().from(skills).all();

  return (
    <div>
      <PageHeader
        title={`Edit: ${rubric.name}`}
        description="Update rubric configuration and text"
      />
      <RubricForm
        mode="edit"
        rubricId={id}
        initialData={{
          name: rubric.name,
          skill_id: rubric.skill_id ?? "",
          category: rubric.category,
          rubric_text: rubric.rubric_text,
          min_score: String(rubric.min_score),
          model: rubric.model,
          status: rubric.status,
          promotion_status: rubric.promotion_status,
        }}
        skills={allSkills}
      />
    </div>
  );
}

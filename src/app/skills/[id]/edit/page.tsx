import { notFound } from "next/navigation";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { SkillForm } from "@/components/skills/skill-form";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const skill = db.select().from(skills).where(eq(skills.id, id)).get();
  if (!skill) notFound();

  return (
    <div>
      <PageHeader
        title="Edit Skill"
        description={`Editing: ${skill.name}`}
      />
      <SkillForm
        mode="edit"
        skillId={id}
        initialData={{
          name: skill.name,
          doc_type: skill.doc_type,
          version: skill.version,
          description: skill.description ?? "",
          priority: skill.priority,
          status: skill.status,
        }}
      />
    </div>
  );
}

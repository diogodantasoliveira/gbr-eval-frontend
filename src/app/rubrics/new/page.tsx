import { db } from "@/db";
import { skills } from "@/db/schema";
import { PageHeader } from "@/components/layout/header";
import { RubricForm } from "@/components/rubrics/rubric-form";

export const dynamic = "force-dynamic";

export default function NewRubricPage() {
  const allSkills = db.select().from(skills).all();

  return (
    <div>
      <PageHeader title="New Rubric" description="Create a new LLM judge rubric" />
      <RubricForm mode="create" skills={allSkills} />
    </div>
  );
}

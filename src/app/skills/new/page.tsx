import { PageHeader } from "@/components/layout/header";
import { SkillForm } from "@/components/skills/skill-form";

export default function NewSkillPage() {
  return (
    <div>
      <PageHeader title="New Skill" description="Create a new extraction skill" breadcrumbs={[{ label: "Skills", href: "/skills" }, { label: "New Skill" }]} />
      <SkillForm mode="create" />
    </div>
  );
}

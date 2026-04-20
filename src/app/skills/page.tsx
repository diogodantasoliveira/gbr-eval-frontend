import Link from "next/link";
import { db } from "@/db";
import { skills, skill_fields } from "@/db/schema";
import { sql } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { SkillList } from "@/components/skills/skill-list";
import { Button } from "@/components/ui/button";

export default function SkillsPage() {
  const allSkills = db.select().from(skills).all();

  const fieldCounts = db
    .select({
      skill_id: skill_fields.skill_id,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(skill_fields)
    .groupBy(skill_fields.skill_id)
    .all();

  const countMap = new Map(fieldCounts.map((r) => [r.skill_id, r.count]));

  const skillsWithCount = allSkills.map((s) => ({
    ...s,
    field_count: countMap.get(s.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Skills" description="Manage the 5 P0 evaluation skills">
        <Button render={<Link href="/skills/new" />}>
          New Skill
        </Button>
      </PageHeader>
      <SkillList skills={skillsWithCount} />
    </div>
  );
}

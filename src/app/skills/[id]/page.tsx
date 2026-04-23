import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { skills, skill_fields } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { FieldSchemaEditor } from "@/components/skills/field-schema-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const skill = db.select().from(skills).where(eq(skills.id, id)).get();
  if (!skill) notFound();

  const fields = db
    .select()
    .from(skill_fields)
    .where(eq(skill_fields.skill_id, id))
    .orderBy(skill_fields.sort_order)
    .all();

  return (
    <div className="space-y-6">
      <PageHeader title={skill.name} description={skill.doc_type} breadcrumbs={[{ label: "Skills", href: "/skills" }, { label: skill.name }]}>
        <Button variant="outline" render={<Link href={`/skills/${id}/edit`} />}>
          Edit Skill
        </Button>
        <Button variant="outline" render={<Link href="/skills" />}>
          Back to Skills
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="mt-0.5">
                <Badge
                  variant={
                    skill.priority === "P0"
                      ? "destructive"
                      : skill.priority === "P1"
                      ? "default"
                      : "outline"
                  }
                >
                  {skill.priority}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                <Badge
                  variant={skill.status === "active" ? "default" : "outline"}
                >
                  {skill.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="mt-0.5 font-mono text-xs">{skill.version}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-0.5 text-foreground">
                {skill.description || (
                  <span className="text-muted-foreground italic">
                    No description
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      <FieldSchemaEditor skillId={id} initialFields={fields} />
    </div>
  );
}

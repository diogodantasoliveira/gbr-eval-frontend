import Link from "next/link";
import { db } from "@/db";
import { rubrics } from "@/db/schema";
import { PageHeader } from "@/components/layout/header";
import { RubricList } from "@/components/rubrics/rubric-list";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function RubricsPage() {
  const allRubrics = db.select().from(rubrics).all();

  return (
    <div>
      <PageHeader title="Rubrics" description="Manage LLM judge rubrics for evaluation">
        <Button render={<Link href="/rubrics/new" />}>
          New Rubric
        </Button>
      </PageHeader>
      <RubricList rubrics={allRubrics} />
    </div>
  );
}

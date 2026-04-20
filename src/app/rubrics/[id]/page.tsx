import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { rubrics, rubric_criteria, rubric_examples, rubric_versions, rubric_concordance_tests, skills } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CriteriaEditor } from "@/components/rubrics/criteria-editor";
import { ExampleEditor } from "@/components/rubrics/example-editor";
import { RubricVersionHistory } from "@/components/rubrics/rubric-version-history";
import { RubricPreview } from "@/components/rubrics/rubric-preview";
import { ConcordancePanel } from "@/components/rubrics/concordance-panel";

export const dynamic = "force-dynamic";

export default async function RubricDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
  if (!rubric) notFound();

  const criteria = db
    .select()
    .from(rubric_criteria)
    .where(eq(rubric_criteria.rubric_id, id))
    .orderBy(rubric_criteria.sort_order)
    .all();

  const examples = db
    .select()
    .from(rubric_examples)
    .where(eq(rubric_examples.rubric_id, id))
    .orderBy(rubric_examples.sort_order)
    .all();

  const versions = db
    .select()
    .from(rubric_versions)
    .where(eq(rubric_versions.rubric_id, id))
    .orderBy(desc(rubric_versions.version))
    .all();

  const skill = rubric.skill_id
    ? db.select().from(skills).where(eq(skills.id, rubric.skill_id)).get()
    : null;

  const concordanceTests = db
    .select()
    .from(rubric_concordance_tests)
    .where(eq(rubric_concordance_tests.rubric_id, id))
    .all();

  const totalConcordanceTests = concordanceTests.length;
  const avgConcordance =
    totalConcordanceTests === 0
      ? 0
      : concordanceTests.reduce((s, t) => s + t.concordance_score, 0) / totalConcordanceTests;

  function getConcordanceRecommendation(avg: number, total: number): string {
    if (total < 10) return "needs_more_tests";
    if (avg >= 0.9) return "ready_for_blocking";
    return "inconsistent";
  }

  const concordanceSummary = {
    avg_concordance: avgConcordance,
    total_tests: totalConcordanceTests,
    recommendation: getConcordanceRecommendation(avgConcordance, totalConcordanceTests),
  };

  return (
    <div className="space-y-6">
      <PageHeader title={rubric.name} description={`v${rubric.version} — ${rubric.category}`}>
        <Button variant="outline" render={<Link href={`/rubrics/${id}/edit`} />}>
          Edit Rubric
        </Button>
        <Button variant="outline" render={<Link href="/rubrics" />}>
          Back to Rubrics
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                <Badge variant={rubric.status === "active" ? "default" : rubric.status === "draft" ? "secondary" : "outline"}>
                  {rubric.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Promotion</dt>
              <dd className="mt-0.5">
                <Badge variant={rubric.promotion_status === "blocking" ? "default" : "outline"}>
                  {rubric.promotion_status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Min Score</dt>
              <dd className="mt-0.5 font-mono text-xs">{rubric.min_score}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="mt-0.5 font-mono text-xs">{rubric.model}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="mt-0.5 font-mono text-xs">v{rubric.version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Skill</dt>
              <dd className="mt-0.5">
                {skill ? (
                  <Link href={`/skills/${skill.id}`} className="text-primary hover:underline text-xs">
                    {skill.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground italic text-xs">None</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="criteria">
            Criteria ({criteria.length})
          </TabsTrigger>
          <TabsTrigger value="examples">
            Examples ({examples.length})
          </TabsTrigger>
          <TabsTrigger value="versions">
            Versions ({versions.length})
          </TabsTrigger>
          <TabsTrigger value="concordance">
            Concordance ({concordanceTests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <RubricPreview
            rubricText={rubric.rubric_text}
            criteria={criteria}
            examples={examples}
            minScore={rubric.min_score}
            model={rubric.model}
          />
        </TabsContent>

        <TabsContent value="criteria" className="pt-4">
          <CriteriaEditor rubricId={id} initialCriteria={criteria} />
        </TabsContent>

        <TabsContent value="examples" className="pt-4">
          <ExampleEditor rubricId={id} initialExamples={examples} />
        </TabsContent>

        <TabsContent value="versions" className="pt-4">
          <RubricVersionHistory versions={versions} currentVersion={rubric.version} />
        </TabsContent>

        <TabsContent value="concordance" className="pt-4">
          <ConcordancePanel
            rubricId={id}
            initialTests={concordanceTests}
            initialSummary={concordanceSummary}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { rubric_ab_tests, rubrics, golden_sets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AbTestResults } from "@/components/rubrics/ab-test-results";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "running") return "secondary";
  return "outline";
}

export default async function AbTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const test = db.select().from(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).get();
  if (!test) notFound();

  const rubricA = db.select().from(rubrics).where(eq(rubrics.id, test.rubric_a_id)).get();
  const rubricB = db.select().from(rubrics).where(eq(rubrics.id, test.rubric_b_id)).get();
  const goldenSet = db
    .select()
    .from(golden_sets)
    .where(eq(golden_sets.id, test.golden_set_id))
    .get();

  const rubricAName = rubricA?.name ?? test.rubric_a_id;
  const rubricBName = rubricB?.name ?? test.rubric_b_id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.name}
        description={`A/B test — ${rubricAName} vs ${rubricBName}`}
      >
        <Badge variant={statusVariant(test.status)}>{test.status}</Badge>
        <Button variant="outline" render={<Link href="/rubrics/ab-tests" />}>
          Back to A/B Tests
        </Button>
      </PageHeader>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Rubric A</dt>
          <dd className="mt-0.5">
            {rubricA ? (
              <Link href={`/rubrics/${rubricA.id}`} className="text-primary hover:underline text-xs">
                {rubricA.name}
              </Link>
            ) : (
              <span className="font-mono text-xs">{test.rubric_a_id}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rubric B</dt>
          <dd className="mt-0.5">
            {rubricB ? (
              <Link href={`/rubrics/${rubricB.id}`} className="text-primary hover:underline text-xs">
                {rubricB.name}
              </Link>
            ) : (
              <span className="font-mono text-xs">{test.rubric_b_id}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Golden Set</dt>
          <dd className="mt-0.5">
            {goldenSet ? (
              <Link href={`/golden-sets/${goldenSet.id}`} className="text-primary hover:underline text-xs">
                {goldenSet.name}
              </Link>
            ) : (
              <span className="font-mono text-xs">{test.golden_set_id}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="mt-0.5 text-xs">{new Date(test.created_at).toLocaleString()}</dd>
        </div>
        {test.completed_at && (
          <div>
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="mt-0.5 text-xs">{new Date(test.completed_at).toLocaleString()}</dd>
          </div>
        )}
        {test.winner && (
          <div>
            <dt className="text-muted-foreground">Winner</dt>
            <dd className="mt-0.5">
              <Badge variant={test.winner === "tie" ? "secondary" : "default"}>
                {test.winner === "tie"
                  ? "Tie"
                  : test.winner === "a"
                  ? `A — ${rubricAName}`
                  : `B — ${rubricBName}`}
              </Badge>
            </dd>
          </div>
        )}
      </dl>

      <AbTestResults
        test={test}
        rubricAName={rubricAName}
        rubricBName={rubricBName}
      />
    </div>
  );
}

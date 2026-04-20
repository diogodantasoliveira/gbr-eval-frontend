import Link from "next/link";
import { db } from "@/db";
import { rubric_ab_tests, rubrics, golden_sets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { AbTestForm } from "@/components/rubrics/ab-test-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "running") return "secondary";
  return "outline";
}

export default function AbTestsPage() {
  const tests = db.select().from(rubric_ab_tests).all();

  // Enrich with rubric names
  const enriched = tests.map((t) => {
    const rubricA = db.select().from(rubrics).where(eq(rubrics.id, t.rubric_a_id)).get();
    const rubricB = db.select().from(rubrics).where(eq(rubrics.id, t.rubric_b_id)).get();
    const goldenSet = db.select().from(golden_sets).where(eq(golden_sets.id, t.golden_set_id)).get();
    return {
      ...t,
      rubric_a_name: rubricA?.name ?? t.rubric_a_id,
      rubric_b_name: rubricB?.name ?? t.rubric_b_id,
      golden_set_name: goldenSet?.name ?? t.golden_set_id,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rubric A/B Tests"
        description="Compare two rubrics on the same golden set to determine which scores better"
      >
        <Button variant="outline" render={<Link href="/rubrics" />}>
          Back to Rubrics
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Create New A/B Test</CardTitle>
        </CardHeader>
        <CardContent>
          <AbTestForm />
        </CardContent>
      </Card>

      {enriched.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">All A/B Tests</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rubric A</TableHead>
                <TableHead>Rubric B</TableHead>
                <TableHead>Golden Set</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/rubrics/ab-tests/${t.id}`}
                      className="hover:underline text-foreground"
                    >
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.rubric_a_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.rubric_b_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.golden_set_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {t.winner ? (
                      <Badge variant={t.winner === "tie" ? "secondary" : "default"}>
                        {t.winner === "tie" ? "Tie" : t.winner === "a" ? `A wins` : `B wins`}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<Link href={`/rubrics/ab-tests/${t.id}`} />}
                    >
                      <span className="sr-only">View</span>
                      →
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {enriched.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No A/B tests yet. Create one above.
        </p>
      )}
    </div>
  );
}

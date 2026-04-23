import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_annotations,
  calibration_disagreements,
  golden_set_cases,
  skill_fields,
  skills,
  golden_sets,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnnotationQueue } from "@/components/calibration/annotation-queue";
import { ConcordanceDashboard } from "@/components/calibration/concordance-dashboard";
import { DisagreementList } from "@/components/calibration/disagreement-list";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = db
    .select()
    .from(calibration_sessions)
    .where(eq(calibration_sessions.id, id))
    .get();

  if (!session) notFound();

  const skill = db
    .select()
    .from(skills)
    .where(eq(skills.id, session.skill_id))
    .get();

  const goldenSet = db
    .select()
    .from(golden_sets)
    .where(eq(golden_sets.id, session.golden_set_id))
    .get();

  const cases = db
    .select()
    .from(golden_set_cases)
    .where(eq(golden_set_cases.golden_set_id, session.golden_set_id))
    .orderBy(golden_set_cases.case_number)
    .all();

  const fields = db
    .select()
    .from(skill_fields)
    .where(eq(skill_fields.skill_id, session.skill_id))
    .orderBy(skill_fields.sort_order)
    .all();

  const annotations = db
    .select()
    .from(calibration_annotations)
    .where(eq(calibration_annotations.session_id, id))
    .all();

  const disagreements = db
    .select({
      id: calibration_disagreements.id,
      session_id: calibration_disagreements.session_id,
      case_id: calibration_disagreements.case_id,
      field_name: calibration_disagreements.field_name,
      annotator_1_value: calibration_disagreements.annotator_1_value,
      annotator_2_value: calibration_disagreements.annotator_2_value,
      resolution: calibration_disagreements.resolution,
      resolved_by: calibration_disagreements.resolved_by,
      resolved_at: calibration_disagreements.resolved_at,
      case_number: golden_set_cases.case_number,
    })
    .from(calibration_disagreements)
    .leftJoin(
      golden_set_cases,
      eq(calibration_disagreements.case_id, golden_set_cases.id)
    )
    .where(eq(calibration_disagreements.session_id, id))
    .all();

  const resolvedCount = disagreements.filter((d) => d.resolution !== null).length;

  // Annotate links for each annotator
  const ann1AnnotateHref = `/calibration/sessions/${id}/annotate?annotator=${encodeURIComponent(session.annotator_1)}`;
  const ann2AnnotateHref = `/calibration/sessions/${id}/annotate?annotator=${encodeURIComponent(session.annotator_2)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Calibration Session`}
        description={`${skill?.name ?? session.skill_id} — ${goldenSet?.name ?? session.golden_set_id}`}
        breadcrumbs={[{ label: "Calibration", href: "/calibration" }, { label: session.id }]}
      >
        <Badge variant={session.status === "completed" ? "default" : "secondary"}>
          {session.status === "in_progress" ? "In Progress" : "Completed"}
        </Badge>
        <Button variant="outline" render={<Link href="/calibration" />}>
          Back
        </Button>
      </PageHeader>

      {/* Annotate buttons */}
      {session.status === "in_progress" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href={ann1AnnotateHref} />}>
            Annotate as {session.annotator_1}
          </Button>
          <Button size="sm" variant="outline" render={<Link href={ann2AnnotateHref} />}>
            Annotate as {session.annotator_2}
          </Button>
        </div>
      )}

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Queue ({cases.length})
          </TabsTrigger>
          <TabsTrigger value="concordance">Concordance</TabsTrigger>
          <TabsTrigger value="disagreements">
            Disagreements ({disagreements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="pt-4">
          <AnnotationQueue
            sessionId={id}
            annotator={session.annotator_1}
            cases={cases.map((c) => ({
              id: c.id,
              case_number: c.case_number,
              status: c.status,
              input_data: c.input_data ?? "{}",
            }))}
            fields={fields.map((f) => ({
              id: f.id,
              field_name: f.field_name,
              field_type: f.field_type,
              criticality: f.criticality,
            }))}
            existingAnnotations={annotations.map((a) => ({
              case_id: a.case_id,
              annotator: a.annotator,
            }))}
            annotator1={session.annotator_1}
            annotator2={session.annotator_2}
          />
        </TabsContent>

        <TabsContent value="concordance" className="pt-4">
          <ConcordanceDashboard
            sessionId={id}
            status={session.status}
            cohensKappa={session.cohens_kappa}
            disagreementsCount={disagreements.length}
            resolvedCount={resolvedCount}
            annotationsCount={annotations.length}
          />
        </TabsContent>

        <TabsContent value="disagreements" className="pt-4">
          <DisagreementList sessionId={id} disagreements={disagreements} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

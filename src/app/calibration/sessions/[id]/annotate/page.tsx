import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_annotations,
  golden_set_cases,
  skill_fields,
  skills,
  golden_sets,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { AnnotationQueue } from "@/components/calibration/annotation-queue";

export const dynamic = "force-dynamic";

export default async function AnnotatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ annotator?: string }>;
}) {
  const { id } = await params;
  const { annotator } = await searchParams;

  const session = db
    .select()
    .from(calibration_sessions)
    .where(eq(calibration_sessions.id, id))
    .get();

  if (!session) notFound();

  // Validate annotator param
  const resolvedAnnotator =
    annotator === session.annotator_1
      ? session.annotator_1
      : annotator === session.annotator_2
      ? session.annotator_2
      : null;

  if (!resolvedAnnotator) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Blind Annotation"
          description="Annotator not recognized for this session"
        >
          <Button variant="outline" render={<Link href={`/calibration/sessions/${id}`} />}>
            Back to Session
          </Button>
        </PageHeader>
        <p className="text-sm text-muted-foreground">
          Provide a valid <code className="font-mono text-xs">?annotator=</code> query
          parameter matching one of the session&apos;s annotators.
        </p>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Annotator 1:</span>{" "}
            <Link
              href={`/calibration/sessions/${id}/annotate?annotator=${encodeURIComponent(session.annotator_1)}`}
              className="text-primary hover:underline font-mono text-xs"
            >
              {session.annotator_1}
            </Link>
          </p>
          <p>
            <span className="text-muted-foreground">Annotator 2:</span>{" "}
            <Link
              href={`/calibration/sessions/${id}/annotate?annotator=${encodeURIComponent(session.annotator_2)}`}
              className="text-primary hover:underline font-mono text-xs"
            >
              {session.annotator_2}
            </Link>
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blind Annotation"
        description={`${skill?.name ?? session.skill_id} — ${goldenSet?.name ?? session.golden_set_id}`}
      >
        <Button
          variant="outline"
          render={<Link href={`/calibration/sessions/${id}`} />}
        >
          Back to Session
        </Button>
      </PageHeader>

      <AnnotationQueue
        sessionId={id}
        annotator={resolvedAnnotator}
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
    </div>
  );
}

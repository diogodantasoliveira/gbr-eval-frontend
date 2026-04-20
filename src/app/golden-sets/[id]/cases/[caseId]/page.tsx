import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { AnnotationForm } from "@/components/annotation/annotation-form";
import { PiiWarning } from "@/components/pii/pii-warning";
import { db } from "@/db";
import { golden_sets, golden_set_cases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { scanForPii } from "@/lib/pii/redactor";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id, caseId } = await params;

  const gs = db
    .select()
    .from(golden_sets)
    .where(eq(golden_sets.id, id))
    .get();

  if (!gs) notFound();

  const c = db
    .select()
    .from(golden_set_cases)
    .where(eq(golden_set_cases.id, caseId))
    .get();

  if (!c) notFound();

  const expectedOutput = safeJsonParse<Record<string, unknown>>(c.expected_output ?? "{}", {});
  const piiScan = scanForPii(expectedOutput);

  const caseData = {
    id: c.id,
    status: c.status,
    case_number: c.case_number,
    document_hash: c.document_hash ?? "sha256:PENDING_COMPUTE",
    document_source: c.document_source ?? "",
    annotator: c.annotator ?? "",
    notes: c.notes ?? "",
    tags: safeJsonParse<string[]>(c.tags ?? "[]", []),
    expected_output: expectedOutput,
    citation: safeJsonParse<Record<string, unknown>>(c.citation ?? "{}", {}),
    version: c.version,
  };

  return (
    <div>
      <PageHeader
        title={`Case #${String(c.case_number).padStart(3, "0")}`}
        description={gs.name}
      >
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/golden-sets/${id}/cases/${caseId}/history`} />}
        >
          <Clock className="size-3.5" />
          Version History
        </Button>
      </PageHeader>

      <PiiWarning scan={piiScan} />

      <AnnotationForm
        goldenSetId={id}
        skillId={gs.skill_id}
        mode="edit"
        initialData={caseData}
      />
    </div>
  );
}

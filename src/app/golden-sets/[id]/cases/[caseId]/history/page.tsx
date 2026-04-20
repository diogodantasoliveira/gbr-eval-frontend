import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { VersionHistory } from "@/components/golden-sets/version-history";
import { db } from "@/db";
import { golden_set_cases, golden_set_versions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CaseHistoryPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id, caseId } = await params;

  const c = db
    .select()
    .from(golden_set_cases)
    .where(eq(golden_set_cases.id, caseId))
    .get();

  if (!c) notFound();

  const rawVersions = db
    .select()
    .from(golden_set_versions)
    .where(eq(golden_set_versions.case_id, caseId))
    .orderBy(desc(golden_set_versions.version))
    .all();

  const versions = rawVersions.map((v) => ({
    id: v.id,
    version: v.version,
    changed_by: v.changed_by,
    changed_at: v.changed_at,
    change_reason: v.change_reason ?? null,
    expected_output: safeJsonParse<Record<string, unknown>>(v.expected_output, {}),
  }));

  return (
    <div>
      <PageHeader
        title={`Version History — Case #${String(c.case_number).padStart(3, "0")}`}
        description={`${versions.length} snapshot${versions.length !== 1 ? "s" : ""} recorded`}
      >
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/golden-sets/${id}/cases/${caseId}`} />}
        >
          <ArrowLeft className="size-3.5" />
          Back to Case
        </Button>
      </PageHeader>

      <VersionHistory versions={versions} />
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { contracts, contract_versions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SchemaViewer } from "@/components/contracts/schema-viewer";
import { ContractVersionHistory } from "@/components/contracts/contract-version-history";
import { safeJsonParse } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "POST":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800";
    case "PUT":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "DELETE":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "";
  }
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contract = db.select().from(contracts).where(eq(contracts.id, id)).get();
  if (!contract) notFound();

  const versions = db
    .select()
    .from(contract_versions)
    .where(eq(contract_versions.contract_id, id))
    .orderBy(desc(contract_versions.version))
    .all();

  const schemaSnapshot = safeJsonParse(contract.schema_snapshot, {});

  const versionsWithParsedSchema = versions.map((v) => ({
    ...v,
    schema_snapshot: safeJsonParse(v.schema_snapshot, {}),
    diff_from_previous: v.diff_from_previous
      ? safeJsonParse(v.diff_from_previous, null)
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${contract.method} ${contract.endpoint}`}
        description={contract.service_name}
      >
        <Button variant="outline" render={<Link href={`/contracts/${id}/edit`} />}>
          Edit
        </Button>
        <Button variant="outline" render={<Link href="/contracts" />}>
          Back
        </Button>
      </PageHeader>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-semibold",
            methodColor(contract.method)
          )}
        >
          {contract.method}
        </span>
        <code className="font-mono text-sm text-foreground">{contract.endpoint}</code>
        <Badge variant={contract.status === "active" ? "default" : "outline"} className="text-xs">
          {contract.status}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">v{contract.version}</span>
        {contract.source_commit && (
          <span className="text-xs text-muted-foreground font-mono">
            commit: {contract.source_commit.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schema">
        <TabsList>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="versions">
            Versions ({versions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-4">
          <SchemaViewer schema={schemaSnapshot} title="Current schema snapshot" />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <ContractVersionHistory
            contractId={id}
            currentVersion={contract.version}
            currentSchema={schemaSnapshot}
            initialVersions={versionsWithParsedSchema}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

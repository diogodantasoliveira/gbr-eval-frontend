import Link from "next/link";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ContractList } from "@/components/contracts/contract-list";
import { ImportOpenApiDialog } from "@/components/contracts/import-openapi-dialog";
import { DriftAlert } from "@/components/contracts/drift-alert";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const rows = db
    .select({
      id: contracts.id,
      service_name: contracts.service_name,
      endpoint: contracts.endpoint,
      method: contracts.method,
      version: contracts.version,
      status: contracts.status,
      source_commit: contracts.source_commit,
      created_at: contracts.created_at,
      updated_at: contracts.updated_at,
    })
    .from(contracts)
    .orderBy(contracts.service_name, contracts.endpoint)
    .all();

  return (
    <div className="space-y-6">
      <PageHeader title="Contracts" description="API contract registry with schema versioning">
        <ImportOpenApiDialog />
        <Button render={<Link href="/contracts/new" />}>
          <Plus className="size-4" />
          New Contract
        </Button>
      </PageHeader>
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Drift Detection</h2>
        <DriftAlert />
      </div>
      <ContractList initialData={rows} />
    </div>
  );
}

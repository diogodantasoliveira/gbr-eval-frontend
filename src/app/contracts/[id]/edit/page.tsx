import { notFound } from "next/navigation";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { ContractForm } from "@/components/contracts/contract-form";
import { safeJsonParse } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contract = db.select().from(contracts).where(eq(contracts.id, id)).get();
  if (!contract) notFound();

  const initialData = {
    id: contract.id,
    service_name: contract.service_name,
    endpoint: contract.endpoint,
    method: contract.method,
    schema_snapshot: safeJsonParse(contract.schema_snapshot, {}),
    source_commit: contract.source_commit,
    status: contract.status,
  };

  return (
    <div>
      <PageHeader
        title="Edit Contract"
        description={`${contract.method} ${contract.endpoint}`}
      />
      <ContractForm mode="edit" initialData={initialData} />
    </div>
  );
}

import { PageHeader } from "@/components/layout/header";
import { ContractForm } from "@/components/contracts/contract-form";

export default function NewContractPage() {
  return (
    <div>
      <PageHeader
        title="New Contract"
        description="Register an API contract with its schema snapshot"
      />
      <ContractForm mode="create" />
    </div>
  );
}

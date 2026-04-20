import { PageHeader } from "@/components/layout/header";
import { GoldenSetForm } from "@/components/golden-sets/golden-set-form";

export default function NewGoldenSetPage() {
  return (
    <div>
      <PageHeader
        title="New Golden Set"
        description="Create a new annotated reference set"
      />
      <GoldenSetForm mode="create" />
    </div>
  );
}

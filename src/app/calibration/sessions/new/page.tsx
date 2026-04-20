import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SessionForm } from "@/components/calibration/session-form";

export default function NewSessionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Calibration Session"
        description="Create a blind annotation session for inter-annotator agreement"
      >
        <Button variant="outline" render={<Link href="/calibration" />}>
          Back
        </Button>
      </PageHeader>
      <SessionForm />
    </div>
  );
}

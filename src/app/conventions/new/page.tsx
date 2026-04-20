"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/header";
import { ConventionForm } from "@/components/conventions/convention-form";
import { PatternEditor } from "@/components/conventions/pattern-editor";

export default function NewConventionPage() {
  const router = useRouter();
  const [positiveExample, setPositiveExample] = useState("");
  const [negativeExample, setNegativeExample] = useState("");

  async function handleSaved(id: string) {
    // If examples are provided, save them via PUT
    if (positiveExample || negativeExample) {
      try {
        await fetch(`/api/conventions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positive_example: positiveExample, negative_example: negativeExample }),
        });
      } catch {
        toast.error("Examples could not be saved");
      }
    }
    router.push(`/conventions/${id}`);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="New Convention Rule"
        description="Define a coding convention to be enforced in engineering evals"
      />
      <div className="space-y-8 max-w-2xl">
        <ConventionForm mode="create" onSaved={handleSaved} />

        <div className="border-t border-border pt-6">
          <PatternEditor
            positiveExample={positiveExample}
            negativeExample={negativeExample}
            onPositiveChange={setPositiveExample}
            onNegativeChange={setNegativeExample}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Examples will be saved after the rule is created.
          </p>
        </div>
      </div>
    </div>
  );
}

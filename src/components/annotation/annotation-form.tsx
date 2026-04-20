"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FieldInput } from "./field-input";
import { CitationInput } from "./citation-input";
import { TagInput } from "@/components/tags/tag-input";
import { CaseStatusBadge } from "@/components/golden-sets/case-status-badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SkillField {
  id: string;
  field_name: string;
  field_type: string;
  criticality: string;
  weight: number;
  required: number;
  validation_pattern: string | null;
  description: string | null;
  sort_order: number;
}

interface CaseData {
  id?: string;
  status?: string;
  case_number?: number;
  document_hash?: string;
  document_source?: string;
  annotator?: string;
  notes?: string;
  tags?: string[];
  expected_output?: Record<string, unknown>;
  citation?: Record<string, unknown>;
  version?: number;
}

interface AnnotationFormProps {
  goldenSetId: string;
  skillId: string;
  mode: "create" | "edit";
  initialData?: CaseData;
}

const CRITICALITY_ORDER = ["CRITICAL", "IMPORTANT", "INFORMATIVE"];

export function AnnotationForm({ goldenSetId, skillId, mode, initialData }: AnnotationFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<SkillField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metaOpen, setMetaOpen] = useState(mode === "create");

  // Metadata
  const [documentHash, setDocumentHash] = useState(initialData?.document_hash ?? "sha256:PENDING_COMPUTE");
  const [documentSource, setDocumentSource] = useState(initialData?.document_source ?? "");
  const [annotator, setAnnotator] = useState(initialData?.annotator ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);

  // Field outputs
  const [outputs, setOutputs] = useState<Record<string, unknown>>(initialData?.expected_output ?? {});

  // Citations per field
  const [citations, setCitations] = useState<Record<string, { page?: number | string; excerpt?: string }>>(
    () => {
      const raw = initialData?.citation ?? {};
      const result: Record<string, { page?: number | string; excerpt?: string }> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          result[k] = v as { page?: number | string; excerpt?: string };
        }
      }
      return result;
    }
  );

  const status = initialData?.status ?? "draft";

  useEffect(() => {
    fetch(`/api/skills/${skillId}/fields`)
      .then((r) => r.json())
      .then((data: SkillField[]) => {
        setFields(data.sort((a, b) => {
          const ao = CRITICALITY_ORDER.indexOf(a.criticality);
          const bo = CRITICALITY_ORDER.indexOf(b.criticality);
          if (ao !== bo) return ao - bo;
          return a.sort_order - b.sort_order;
        }));
      })
      .catch(() => toast.error("Failed to load skill fields"))
      .finally(() => setLoadingFields(false));
  }, [skillId]);

  function buildPayload(targetStatus?: string) {
    // Build citation object from per-field state
    const citation: Record<string, unknown> = {};
    for (const [fieldName, cit] of Object.entries(citations)) {
      if (cit.page !== undefined || cit.excerpt) {
        citation[fieldName] = cit;
      }
    }

    return {
      document_hash: documentHash,
      document_source: documentSource,
      annotator,
      notes,
      tags,
      expected_output: outputs,
      citation,
      ...(targetStatus ? { status: targetStatus } : {}),
      change_reason: targetStatus ? `Status changed to ${targetStatus}` : "",
    };
  }

  async function save(targetStatus?: string) {
    setSaving(true);
    try {
      const payload = buildPayload(targetStatus);

      if (mode === "create") {
        const res = await fetch(`/api/golden-sets/${goldenSetId}/cases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Failed to create case");
        }
        const created = await res.json();
        toast.success("Case created");
        router.push(`/golden-sets/${goldenSetId}/cases/${created.id}`);
      } else {
        const res = await fetch(`/api/golden-sets/${goldenSetId}/cases/${initialData!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Failed to save case");
        }
        toast.success(targetStatus ? `Status updated to ${targetStatus}` : "Case saved");
        router.refresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const groupedFields: Record<string, SkillField[]> = { CRITICAL: [], IMPORTANT: [], INFORMATIVE: [] };
  for (const f of fields) {
    groupedFields[f.criticality]?.push(f);
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Status + version info */}
      {mode === "edit" && (
        <div className="flex items-center gap-3">
          <CaseStatusBadge status={status} />
          {initialData?.case_number !== undefined && (
            <span className="text-sm text-muted-foreground">
              Case #{String(initialData.case_number).padStart(3, "0")}
            </span>
          )}
          {initialData?.version !== undefined && (
            <span className="text-xs text-muted-foreground">v{initialData.version}</span>
          )}
        </div>
      )}

      {/* Metadata section (collapsible) */}
      <div className="rounded-md border border-border">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          onClick={() => setMetaOpen((o) => !o)}
        >
          {metaOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Metadata
          {!metaOpen && (annotator || documentSource) && (
            <span className="text-xs text-muted-foreground ml-1">
              {annotator && `annotator: ${annotator}`}
              {annotator && documentSource && " · "}
              {documentSource && `source: ${documentSource}`}
            </span>
          )}
        </button>

        {metaOpen && (
          <div className="px-4 pb-4 space-y-4">
            <Separator />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="annotator">Annotator</Label>
                <Input
                  id="annotator"
                  value={annotator}
                  onChange={(e) => setAnnotator(e.target.value)}
                  placeholder="diogo.dantas"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="document_source">Document Source</Label>
                <Input
                  id="document_source"
                  value={documentSource}
                  onChange={(e) => setDocumentSource(e.target.value)}
                  placeholder="internal:matricula:001"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="document_hash">Document Hash</Label>
                <Input
                  id="document_hash"
                  value={documentHash}
                  onChange={(e) => setDocumentHash(e.target.value)}
                  placeholder="sha256:..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations about this case..."
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tags</Label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>
        )}
      </div>

      {/* Fields */}
      {loadingFields ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading fields...</div>
      ) : (
        <>
          {(["CRITICAL", "IMPORTANT", "INFORMATIVE"] as const).map((criticality) => {
            const group = groupedFields[criticality] ?? [];
            if (group.length === 0) return null;

            return (
              <div key={criticality} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    criticality === "CRITICAL" && "text-red-600 dark:text-red-400",
                    criticality === "IMPORTANT" && "text-amber-600 dark:text-amber-400",
                    criticality === "INFORMATIVE" && "text-blue-600 dark:text-blue-400"
                  )}>
                    {criticality}
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {group.map((field) => (
                  <div key={field.id}>
                    <FieldInput
                      field={field}
                      value={outputs[field.field_name]}
                      onChange={(val) =>
                        setOutputs((prev) => ({ ...prev, [field.field_name]: val }))
                      }
                    />
                    <div className="pl-3">
                      <CitationInput
                        fieldName={field.field_name}
                        value={citations[field.field_name] ?? {}}
                        onChange={(cit) =>
                          setCitations((prev) => ({ ...prev, [field.field_name]: cit }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <Button
            onClick={() => save()}
            disabled={saving || loadingFields}
            variant="outline"
          >
            {saving ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            onClick={() => save("annotated")}
            disabled={saving || loadingFields}
          >
            {saving ? "Saving..." : "Save & Mark Annotated"}
          </Button>

          {mode === "edit" && status === "annotated" && (
            <Button
              variant="outline"
              onClick={() => save("reviewed")}
              disabled={saving}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
            >
              Mark Reviewed
            </Button>
          )}

          {mode === "edit" && status === "reviewed" && (
            <Button
              variant="outline"
              onClick={() => save("approved")}
              disabled={saving}
              className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950"
            >
              Approve
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={saving}
            className="ml-auto"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

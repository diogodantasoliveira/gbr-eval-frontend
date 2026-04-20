"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SkillField {
  id: string;
  field_name: string;
  field_type: string;
  criticality: string;
}

interface GoldenSetCase {
  id: string;
  case_number: number;
  status: string;
  input_data: string;
}

interface Annotation {
  case_id: string;
  annotator: string;
}

interface AnnotationQueueProps {
  sessionId: string;
  annotator: string;
  cases: GoldenSetCase[];
  fields: SkillField[];
  existingAnnotations: Annotation[];
  annotator1: string;
  annotator2: string;
}

interface CaseStatus {
  ann1Done: boolean;
  ann2Done: boolean;
}

export function AnnotationQueue({
  sessionId,
  annotator,
  cases,
  fields,
  existingAnnotations,
  annotator1,
  annotator2,
}: AnnotationQueueProps) {
  const [selectedCase, setSelectedCase] = useState<GoldenSetCase | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [annotated, setAnnotated] = useState<Set<string>>(new Set());
  const [caseStatuses, setCaseStatuses] = useState<Record<string, CaseStatus>>({});

  useEffect(() => {
    const done = new Set<string>();
    const statuses: Record<string, CaseStatus> = {};

    for (const c of cases) {
      const ann1Done = existingAnnotations.some(
        (a) => a.case_id === c.id && a.annotator === annotator1
      );
      const ann2Done = existingAnnotations.some(
        (a) => a.case_id === c.id && a.annotator === annotator2
      );
      statuses[c.id] = { ann1Done, ann2Done };
      if (
        existingAnnotations.some(
          (a) => a.case_id === c.id && a.annotator === annotator
        )
      ) {
        done.add(c.id);
      }
    }

    setAnnotated(done);
    setCaseStatuses(statuses);
  }, [existingAnnotations, cases, annotator, annotator1, annotator2]);

  function openCase(c: GoldenSetCase) {
    if (annotated.has(c.id)) {
      toast.info("You already annotated this case");
      return;
    }
    setSelectedCase(c);
    const initial: Record<string, string> = {};
    for (const f of fields) {
      initial[f.field_name] = "";
    }
    setFieldValues(initial);
  }

  async function submitAnnotation() {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/calibration/sessions/${sessionId}/annotate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_id: selectedCase.id,
            annotator,
            annotations: fieldValues,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to submit annotation");
        return;
      }

      toast.success(`Case #${selectedCase.case_number} annotated`);
      setAnnotated((prev) => new Set([...prev, selectedCase.id]));
      setCaseStatuses((prev) => ({
        ...prev,
        [selectedCase.id]: {
          ...prev[selectedCase.id],
          ann1Done:
            annotator === annotator1
              ? true
              : prev[selectedCase.id]?.ann1Done ?? false,
          ann2Done:
            annotator === annotator2
              ? true
              : prev[selectedCase.id]?.ann2Done ?? false,
        },
      }));
      setSelectedCase(null);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function getCaseIcon(caseId: string) {
    const status = caseStatuses[caseId];
    if (!status) return <Circle className="size-4 text-muted-foreground" />;
    const myDone = annotated.has(caseId);
    if (status.ann1Done && status.ann2Done) {
      return <CheckCircle2 className="size-4 text-green-500" />;
    }
    if (myDone) {
      return <Clock className="size-4 text-amber-500" />;
    }
    return <Circle className="size-4 text-muted-foreground" />;
  }

  function getCaseLabel(caseId: string) {
    const status = caseStatuses[caseId];
    if (!status) return "not started";
    if (status.ann1Done && status.ann2Done) return "both done";
    if (annotated.has(caseId)) return "waiting for other annotator";
    if (status.ann1Done || status.ann2Done) return "partially done";
    return "not started";
  }

  const doneCount = annotated.size;
  const totalCount = cases.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Annotating as{" "}
          <span className="font-mono font-medium text-foreground">{annotator}</span>
        </p>
        <Badge variant="outline">
          {doneCount}/{totalCount} cases done
        </Badge>
      </div>

      <div className="grid gap-2">
        {cases.map((c) => {
          const isDone = annotated.has(c.id);
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                isDone
                  ? "border-border bg-muted/30"
                  : "border-border hover:bg-muted/50 cursor-pointer"
              }`}
              onClick={() => !isDone && openCase(c)}
            >
              <div className="flex items-center gap-2.5">
                {getCaseIcon(c.id)}
                <span className="text-sm font-medium">Case #{c.case_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {getCaseLabel(c.id)}
                </span>
                {!isDone && (
                  <Button size="xs" variant="outline" onClick={() => openCase(c)}>
                    Annotate
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!selectedCase}
        onOpenChange={(open) => !open && setSelectedCase(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Annotate Case #{selectedCase?.case_number}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Blind annotation — your answers are hidden from the other annotator
            until both submit.
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {fields.map((field) => (
              <div key={field.id} className="space-y-1">
                <Label htmlFor={`field-${field.field_name}`} className="flex items-center gap-1.5">
                  {field.field_name}
                  <Badge
                    variant={
                      field.criticality === "CRITICAL"
                        ? "default"
                        : field.criticality === "IMPORTANT"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[10px]"
                  >
                    {field.criticality}
                  </Badge>
                </Label>
                <Input
                  id={`field-${field.field_name}`}
                  placeholder={`Enter ${field.field_name}...`}
                  value={fieldValues[field.field_name] ?? ""}
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [field.field_name]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedCase(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submitAnnotation} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Annotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/form-field";
import { GraderPicker, type GraderEntry } from "./grader-picker";
import { YamlPreview } from "./yaml-preview";
import {
  EVAL_CHECKLIST_QUESTIONS,
  type EvalChecklist,
  type CreateTaskInput,
} from "@/lib/validations/task";

const STEPS = [
  "Metadata",
  "EVAL First Checklist",
  "Input Config",
  "Graders",
  "Review & Save",
] as const;

type Step = (typeof STEPS)[number];

interface WizardState {
  // Step 1 - Metadata
  task_id: string;
  category: string;
  component: string;
  layer: string;
  tier: string;
  description: string;
  scoring_mode: string;
  pass_threshold: string;
  target_threshold: string;
  tenant_profile: string;
  skill_id: string;
  golden_set_id: string;
  status: string;
  // Epochs & Reducers
  epochs: string;
  reducers: string[];
  primary_reducer: string;
  // Ownership
  eval_owner: string;
  eval_cadence: string;
  golden_set_tags: string;
  // Step 2 - Checklist
  checklist: Partial<EvalChecklist>;
  // Step 3 - Input
  endpoint: string;
  payload: string;
  fixture_path: string;
  // Step 4 - Graders
  graders: GraderEntry[];
}

function emptyState(): WizardState {
  return {
    task_id: "",
    category: "extraction",
    component: "ai-engine",
    layer: "product",
    tier: "gate",
    description: "",
    scoring_mode: "weighted",
    pass_threshold: "0.95",
    target_threshold: "",
    tenant_profile: "global",
    skill_id: "",
    golden_set_id: "",
    status: "draft",
    epochs: "1",
    reducers: ["mean"],
    primary_reducer: "mean",
    eval_owner: "",
    eval_cadence: "",
    golden_set_tags: "",
    checklist: {},
    endpoint: "",
    payload: "{}",
    fixture_path: "",
    graders: [],
  };
}

interface TaskWizardProps {
  mode: "create" | "edit";
  initialTask?: Partial<WizardState> & { id?: string };
}

export function TaskWizard({ mode, initialTask }: TaskWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<WizardState>(() => ({
    ...emptyState(),
    ...initialTask,
  }));
  const initialRef = useRef(state)
  const isDirty = JSON.stringify(state) !== JSON.stringify(initialRef.current)
  useUnsavedChanges(isDirty)
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState<Array<{ id: string; name: string }>>([]);
  const [goldenSets, setGoldenSets] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((json) => setSkills(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => {});
    fetch("/api/golden-sets")
      .then((r) => r.json())
      .then((json) => setGoldenSets(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => {});
  }, []);

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function setChecklist(key: keyof EvalChecklist, value: string) {
    setState((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: value },
    }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  function stepIsValid(idx: number): boolean {
    if (idx === 0) {
      return (
        state.task_id.trim().length > 0 &&
        /^[a-z0-9_.-]+$/.test(state.task_id) &&
        state.category.length > 0 &&
        state.layer.length > 0
      );
    }
    if (idx === 1) {
      return EVAL_CHECKLIST_QUESTIONS.every(
        ({ key }) => (state.checklist[key] ?? "").trim().length > 0
      );
    }
    return true;
  }

  function validateStep(idx: number): boolean {
    if (idx === 0) {
      const newErrors: Record<string, string> = {};
      if (!state.task_id.trim()) {
        newErrors.task_id = "Task ID is required";
      } else if (!/^[a-z0-9_.-]+$/.test(state.task_id)) {
        newErrors.task_id = "Lowercase letters, digits, dots, dashes, and underscores only";
      }
      if (!state.category) newErrors.category = "Category is required";
      if (!state.layer) newErrors.layer = "Layer is required";
      if (Object.keys(newErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...newErrors }));
        return false;
      }
      return true;
    }
    if (idx === 1) {
      const newErrors: Record<string, string> = {};
      EVAL_CHECKLIST_QUESTIONS.forEach(({ key, label }) => {
        if (!(state.checklist[key] ?? "").trim()) {
          newErrors[key as string] = `${label} is required`;
        }
      });
      if (Object.keys(newErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...newErrors }));
        return false;
      }
      return true;
    }
    return true;
  }

  function cleanGraderConfig(g: GraderEntry): Record<string, unknown> {
    const config = { ...g.config };
    if (g.grader_type === "convention_check" && Array.isArray(config.rules)) {
      config.rules = (config.rules as Array<{ pattern: string }>).filter(
        (r) => r.pattern.trim().length > 0
      );
    }
    return config;
  }

  async function saveGraders(taskId: string) {
    for (const g of state.graders) {
      await fetch(`/api/tasks/${taskId}/graders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grader_type: g.grader_type,
          field: g.field || null,
          weight: g.weight,
          required: g.required,
          config: cleanGraderConfig(g),
          model_role: g.model_role || null,
          sort_order: g.sort_order,
        }),
      });
    }
  }

  async function saveDraft() {
    await save("draft");
  }

  async function save(overrideStatus?: string) {
    setSaving(true);
    try {
      let payloadObj: Record<string, unknown> = {};
      try { payloadObj = JSON.parse(state.payload); } catch { payloadObj = {}; }

      const tags = state.golden_set_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const taskBody: CreateTaskInput = {
        task_id: state.task_id.trim(),
        category: state.category as CreateTaskInput["category"],
        component: state.component,
        layer: state.layer as CreateTaskInput["layer"],
        tier: state.tier as CreateTaskInput["tier"],
        description: state.description,
        scoring_mode: state.scoring_mode as CreateTaskInput["scoring_mode"],
        pass_threshold: parseFloat(state.pass_threshold) || 0.95,
        target_threshold: state.target_threshold ? parseFloat(state.target_threshold) : null,
        tenant_profile: state.tenant_profile || "global",
        skill_id: state.skill_id || null,
        golden_set_id: state.golden_set_id || null,
        eval_checklist: state.checklist,
        epochs: parseInt(state.epochs, 10) || 1,
        reducers: state.reducers as CreateTaskInput["reducers"],
        primary_reducer: state.primary_reducer as CreateTaskInput["primary_reducer"],
        eval_owner: state.eval_owner || null,
        eval_cadence: state.eval_cadence || null,
        golden_set_tags: tags.length > 0 ? tags : null,
        status: (overrideStatus ?? state.status) as CreateTaskInput["status"],
      };

      let taskId: string;

      if (mode === "create") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskBody),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error ?? "Failed to create task");
          return;
        }
        const created = await res.json();
        taskId = created.id;

        // Save input
        if (state.endpoint || state.fixture_path || state.payload !== "{}") {
          await fetch(`/api/tasks/${taskId}/input`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: state.endpoint || null, payload: payloadObj, fixture_path: state.fixture_path || null }),
          });
        }

        // Save graders
        await saveGraders(taskId);

        toast.success("Task created");
      } else {
        const id = initialTask?.id;
        if (!id) { toast.error("No task ID for update"); return; }
        taskId = id;

        const res = await fetch(`/api/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskBody),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error ?? "Failed to update task");
          return;
        }

        // Sync input
        if (state.endpoint || state.fixture_path || state.payload !== "{}") {
          await fetch(`/api/tasks/${id}/input`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: state.endpoint || null, payload: payloadObj, fixture_path: state.fixture_path || null }),
          });
        }

        // Delete existing graders and re-create
        await fetch(`/api/tasks/${id}/graders`, { method: "DELETE" });
        await saveGraders(id);

        toast.success("Task updated");
      }

      router.push(`/tasks/${taskId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const currentStep = STEPS[stepIndex];

  let payloadObj: Record<string, unknown> = {};
  try { payloadObj = JSON.parse(state.payload); } catch { payloadObj = {}; }

  const previewTags = state.golden_set_tags.split(",").map((t) => t.trim()).filter(Boolean);
  const exportPreview = {
    task_id: state.task_id,
    category: state.category,
    component: state.component || undefined,
    layer: state.layer,
    tier: state.tier,
    pass_threshold: parseFloat(state.pass_threshold) || 0.95,
    epochs: parseInt(state.epochs, 10) || 1,
    reducers: state.reducers,
    primary_reducer: state.primary_reducer,
    eval_owner: state.eval_owner || undefined,
    eval_cadence: state.eval_cadence || undefined,
    golden_set_tags: previewTags.length > 0 ? previewTags : undefined,
    input: { payload: payloadObj, fixture_path: state.fixture_path || undefined },
    graders: state.graders.map((g) => ({
      type: g.grader_type,
      field: g.field || undefined,
      weight: g.weight,
      required: g.required || undefined,
      model_role: g.model_role || undefined,
      ...g.config,
    })),
    eval_checklist: state.checklist,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Step indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => (
          <div key={step} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => idx < stepIndex && setStepIndex(idx)}
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                idx === stepIndex
                  ? "bg-primary text-primary-foreground"
                  : idx < stepIndex
                  ? "bg-muted text-foreground cursor-pointer hover:bg-muted/80"
                  : "bg-muted/40 text-muted-foreground cursor-default",
              ].join(" ")}
            >
              <span className="size-4 rounded-full flex items-center justify-center text-[10px] font-bold">
                {idx + 1}
              </span>
              {step}
            </button>
            {idx < STEPS.length - 1 && (
              <span className="text-muted-foreground text-xs">›</span>
            )}
          </div>
        ))}
      </div>

      <Separator />

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{currentStep}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Metadata */}
          {stepIndex === 0 && (
            <>
              <FormField error={fieldErrors.task_id}>
                <Label>Task ID <span className="text-destructive">*</span></Label>
                <Input
                  value={state.task_id}
                  onChange={(e) => set("task_id", e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  placeholder="extraction.matricula.cpf"
                  className="font-mono"
                  aria-invalid={!!fieldErrors.task_id}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, dots/dashes/underscores only. Pattern: category.doc_type.field
                </p>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField error={fieldErrors.category}>
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={state.category} onValueChange={(v) => set("category", v ?? "extraction")}>
                    <SelectTrigger aria-invalid={!!fieldErrors.category}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["classification","extraction","decision","citation","cost","latency","code_quality","tenant_isolation","convention"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField error={fieldErrors.layer}>
                  <Label>Layer <span className="text-destructive">*</span></Label>
                  <Select value={state.layer} onValueChange={(v) => set("layer", v ?? "product")}>
                    <SelectTrigger aria-invalid={!!fieldErrors.layer}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["engineering","product","operational","compliance"].map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="space-y-1">
                  <Label>Tier</Label>
                  <Select value={state.tier} onValueChange={(v) => set("tier", v ?? "gate")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["gate","regression","canary"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Scoring Mode</Label>
                  <Select value={state.scoring_mode} onValueChange={(v) => set("scoring_mode", v ?? "weighted")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["weighted","binary","hybrid"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Pass Threshold</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={state.pass_threshold}
                    onChange={(e) => set("pass_threshold", e.target.value)}
                    placeholder="0.95"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Target Threshold</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={state.target_threshold}
                    onChange={(e) => set("target_threshold", e.target.value)}
                    placeholder="optional"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Component</Label>
                  <Input
                    value={state.component}
                    onChange={(e) => set("component", e.target.value)}
                    placeholder="ai-engine"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Tenant Profile</Label>
                  <Input
                    value={state.tenant_profile}
                    onChange={(e) => set("tenant_profile", e.target.value)}
                    placeholder="global"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={state.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What this task evaluates..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Linked Skill</Label>
                  <Select value={state.skill_id || "__none__"} onValueChange={(v) => set("skill_id", (v ?? "__none__") === "__none__" ? "" : (v ?? ""))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {skills.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Linked Golden Set</Label>
                  <Select value={state.golden_set_id || "__none__"} onValueChange={(v) => set("golden_set_id", (v ?? "__none__") === "__none__" ? "" : (v ?? ""))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {goldenSets.map((gs) => (
                        <SelectItem key={gs.id} value={gs.id}>{gs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={state.status} onValueChange={(v) => set("status", v ?? "draft")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["draft","active","deprecated"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Epochs</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={state.epochs}
                    onChange={(e) => set("epochs", e.target.value)}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">Runs per eval (1-100)</p>
                </div>

                <div className="space-y-1">
                  <Label>Primary Reducer</Label>
                  <Select value={state.primary_reducer} onValueChange={(v) => set("primary_reducer", v ?? "mean")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {state.reducers.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Reducers</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["mean","at_least_one","all_pass","majority","median"].map((r) => (
                      <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.reducers.includes(r)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...state.reducers, r]
                              : state.reducers.filter((v) => v !== r);
                            if (next.length === 0) return;
                            setState((prev) => ({
                              ...prev,
                              reducers: next,
                              primary_reducer: next.includes(prev.primary_reducer) ? prev.primary_reducer : next[0],
                            }));
                          }}
                          className="rounded"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Eval Owner</Label>
                  <Input
                    value={state.eval_owner}
                    onChange={(e) => set("eval_owner", e.target.value)}
                    placeholder="team or person"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Eval Cadence</Label>
                  <Select value={state.eval_cadence || "__none__"} onValueChange={(v) => set("eval_cadence", v === "__none__" ? "" : (v ?? ""))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {["on_pr","daily","weekly","on_demand"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Golden Set Tags</Label>
                  <Input
                    value={state.golden_set_tags}
                    onChange={(e) => set("golden_set_tags", e.target.value)}
                    placeholder="standard, edge_case"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated</p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: EVAL First Checklist */}
          {stepIndex === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                All 7 questions are required before a task can be activated.
              </p>
              {EVAL_CHECKLIST_QUESTIONS.map(({ key, label, placeholder }) => (
                <FormField key={key} error={fieldErrors[key as string]}>
                  <Label>
                    {label} <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={state.checklist[key] ?? ""}
                    onChange={(e) => setChecklist(key, e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    aria-invalid={!!fieldErrors[key as string]}
                  />
                </FormField>
              ))}
            </div>
          )}

          {/* Step 3: Input Config */}
          {stepIndex === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Endpoint</Label>
                <Input
                  value={state.endpoint}
                  onChange={(e) => set("endpoint", e.target.value)}
                  placeholder="/api/v1/extract"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label>Payload (JSON)</Label>
                <Textarea
                  value={state.payload}
                  onChange={(e) => set("payload", e.target.value)}
                  placeholder='{"skill": "matricula_v1", "document_type": "matricula"}'
                  rows={6}
                  className="font-mono text-xs"
                />
                {(() => {
                  try { JSON.parse(state.payload); return null; }
                  catch { return <p className="text-xs text-destructive">Invalid JSON</p>; }
                })()}
              </div>

              <div className="space-y-1">
                <Label>Fixture Path</Label>
                <Input
                  value={state.fixture_path}
                  onChange={(e) => set("fixture_path", e.target.value)}
                  placeholder="golden/matricula/case_001.json"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Step 4: Graders */}
          {stepIndex === 3 && (
            <GraderPicker
              graders={state.graders}
              onChange={(graders) => set("graders", graders)}
            />
          )}

          {/* Step 5: Review & Save */}
          {stepIndex === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Task ID</p>
                  <p className="font-mono font-medium">{state.task_id || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Category / Layer</p>
                  <p>{state.category} / {state.layer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tier / Scoring</p>
                  <p>{state.tier} / {state.scoring_mode}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pass Threshold</p>
                  <p>{(parseFloat(state.pass_threshold) * 100 || 95).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Graders</p>
                  <p>{state.graders.length} configured</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Epochs / Reducer</p>
                  <p>{state.epochs}x / {state.primary_reducer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Owner</p>
                  <p>{state.eval_owner || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Checklist</p>
                  <p>
                    {EVAL_CHECKLIST_QUESTIONS.filter(({ key }) => state.checklist[key]).length}
                    /{EVAL_CHECKLIST_QUESTIONS.length} answered
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  YAML Preview
                </p>
                <YamlPreview data={exportPreview} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setStepIndex((i) => i - 1)}
              disabled={saving}
            >
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={saveDraft}
            disabled={saving || !state.task_id.trim()}
          >
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
        </div>

        <div>
          {stepIndex < STEPS.length - 1 ? (
            <Button
              onClick={() => {
                if (validateStep(stepIndex)) setStepIndex((i) => i + 1);
              }}
              disabled={saving}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => save()}
              disabled={saving || !stepIsValid(0)}
            >
              {saving ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

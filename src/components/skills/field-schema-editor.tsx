"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddFieldDialog } from "./add-field-dialog";

interface SkillField {
  id: string;
  skill_id: string;
  field_name: string;
  field_type: string;
  criticality: string;
  weight: number;
  required: number;
  validation_pattern: string | null;
  description: string | null;
  sort_order: number;
}

interface FieldSchemaEditorProps {
  skillId: string;
  initialFields: SkillField[];
}

const FIELD_TYPES = ["string", "number", "boolean", "date", "list", "nested"];
const CRITICALITIES = ["CRITICAL", "IMPORTANT", "INFORMATIVE"];

function criticalityVariant(
  c: string
): "destructive" | "default" | "secondary" | "outline" {
  if (c === "CRITICAL") return "destructive";
  if (c === "IMPORTANT") return "default";
  return "secondary";
}

function criticalityClass(c: string): string {
  if (c === "IMPORTANT")
    return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";
  if (c === "INFORMATIVE")
    return "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400";
  return "";
}

interface EditState {
  field_name: string;
  field_type: string;
  criticality: string;
  required: boolean;
  description: string;
}

export function FieldSchemaEditor({
  skillId,
  initialFields,
}: FieldSchemaEditorProps) {
  const [fields, setFields] = useState<SkillField[]>(initialFields);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkillField | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshFields = useCallback(async () => {
    const res = await fetch(`/api/skills/${skillId}/fields`);
    if (res.ok) {
      const data = await res.json();
      setFields(data);
    }
  }, [skillId]);

  function startEdit(field: SkillField) {
    setEditingId(field.id);
    setEditState({
      field_name: field.field_name,
      field_type: field.field_type,
      criticality: field.criticality,
      required: field.required === 1,
      description: field.description ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveEdit(fieldId: string) {
    if (!editState) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/fields/${fieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editState),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update field");
        return;
      }
      toast.success("Field updated");
      setEditingId(null);
      setEditState(null);
      await refreshFields();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/skills/${skillId}/fields/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed to delete field");
        return;
      }
      toast.success(`Field "${deleteTarget.field_name}" deleted`);
      setDeleteTarget(null);
      await refreshFields();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Fields ({fields.length})
        </h2>
        <AddFieldDialog skillId={skillId} onAdded={refreshFields} />
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No fields defined yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => {
              const isEditing = editingId === field.id;
              return (
                <TableRow key={field.id}>
                  {isEditing && editState ? (
                    <>
                      <TableCell>
                        <Input
                          value={editState.field_name}
                          onChange={(e) =>
                            setEditState((s) =>
                              s ? { ...s, field_name: e.target.value } : s
                            )
                          }
                          className="h-7 w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editState.field_type}
                          onValueChange={(v) =>
                            v != null && setEditState((s) =>
                              s ? { ...s, field_type: v } : s
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editState.criticality}
                          onValueChange={(v) =>
                            v != null && setEditState((s) =>
                              s ? { ...s, criticality: v } : s
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CRITICALITIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={editState.required}
                          onChange={(e) =>
                            setEditState((s) =>
                              s ? { ...s, required: e.target.checked } : s
                            )
                          }
                          className="h-4 w-4 rounded border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editState.description}
                          onChange={(e) =>
                            setEditState((s) =>
                              s ? { ...s, description: e.target.value } : s
                            )
                          }
                          className="h-7 w-40"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => saveEdit(field.id)}
                            disabled={saving}
                          >
                            <Check className="size-3.5 text-green-600" />
                            <span className="sr-only">Save</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="size-3.5" />
                            <span className="sr-only">Cancel</span>
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">
                        {field.field_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {field.field_type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={criticalityVariant(field.criticality)}
                          className={criticalityClass(field.criticality)}
                        >
                          {field.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {field.required ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">
                        {field.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(field)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(field)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Field</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete field{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.field_name}
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

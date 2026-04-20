"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Skill {
  id: string;
  name: string;
  doc_type: string;
}

interface GoldenSet {
  id: string;
  name: string;
  skill_id: string;
}

export function SessionForm() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [goldenSets, setGoldenSets] = useState<GoldenSet[]>([]);
  const [filteredGoldenSets, setFilteredGoldenSets] = useState<GoldenSet[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [skillId, setSkillId] = useState("");
  const [goldenSetId, setGoldenSetId] = useState("");
  const [annotator1, setAnnotator1] = useState("");
  const [annotator2, setAnnotator2] = useState("");

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((json) => setSkills(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => toast.error("Failed to load skills"));

    fetch("/api/golden-sets")
      .then((r) => r.json())
      .then((json) => setGoldenSets(Array.isArray(json) ? json : (json?.data ?? [])))
      .catch(() => toast.error("Failed to load golden sets"));
  }, []);

  useEffect(() => {
    if (skillId) {
      setFilteredGoldenSets(goldenSets.filter((gs) => gs.skill_id === skillId));
      setGoldenSetId("");
    } else {
      setFilteredGoldenSets(goldenSets);
    }
  }, [skillId, goldenSets]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!skillId || !goldenSetId || !annotator1.trim() || !annotator2.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (annotator1.trim() === annotator2.trim()) {
      toast.error("Annotator 1 and Annotator 2 must be different");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/calibration/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_id: skillId,
          golden_set_id: goldenSetId,
          annotator_1: annotator1.trim(),
          annotator_2: annotator2.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create session");
        return;
      }

      const session = await res.json();
      toast.success("Calibration session created");
      router.push(`/calibration/sessions/${session.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Session Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skill">Skill</Label>
            <Select value={skillId} onValueChange={(v) => setSkillId(v ?? "")}>
              <SelectTrigger id="skill" className="w-full">
                <SelectValue placeholder="Select a skill..." />
              </SelectTrigger>
              <SelectContent>
                {skills.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.doc_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="golden-set">Golden Set</Label>
            <Select
              value={goldenSetId}
              onValueChange={(v) => setGoldenSetId(v ?? "")}
              disabled={!skillId}
            >
              <SelectTrigger id="golden-set" className="w-full">
                <SelectValue
                  placeholder={skillId ? "Select a golden set..." : "Select a skill first"}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredGoldenSets.map((gs) => (
                  <SelectItem key={gs.id} value={gs.id}>
                    {gs.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annotator-1">Annotator 1</Label>
            <Input
              id="annotator-1"
              placeholder="e.g. alice@example.com"
              value={annotator1}
              onChange={(e) => setAnnotator1(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annotator-2">Annotator 2</Label>
            <Input
              id="annotator-2"
              placeholder="e.g. bob@example.com"
              value={annotator2}
              onChange={(e) => setAnnotator2(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Session"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/calibration")}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

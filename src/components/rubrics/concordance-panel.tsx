"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ConcordanceTest {
  id: string;
  case_id: string;
  scores: string;
  concordance_score: number;
  created_at: number;
}

interface ConcordanceSummary {
  avg_concordance: number;
  total_tests: number;
  recommendation: string;
}

interface ConcordancePanelProps {
  rubricId: string;
  initialTests: ConcordanceTest[];
  initialSummary: ConcordanceSummary;
}

function concordanceColor(score: number): string {
  if (score >= 0.9) return "text-green-600 dark:text-green-400";
  if (score >= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function recommendationVariant(rec: string): "default" | "outline" | "secondary" {
  if (rec === "ready_for_blocking") return "default";
  if (rec === "needs_more_tests") return "secondary";
  return "outline";
}

function recommendationLabel(rec: string): string {
  if (rec === "ready_for_blocking") return "Ready for Blocking";
  if (rec === "needs_more_tests") return "Needs More Tests";
  return "Inconsistent";
}

function parseScores(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ConcordancePanel({
  rubricId,
  initialTests,
  initialSummary,
}: ConcordancePanelProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [score3, setScore3] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const scores = [Number(score1), Number(score2), Number(score3)];
    if (scores.some((s) => isNaN(s) || s < 1 || s > 5)) {
      toast.error("All three scores must be numbers between 1 and 5");
      return;
    }
    if (!caseId.trim()) {
      toast.error("Case ID is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rubrics/${rubricId}/concordance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId.trim(), scores }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit concordance test");
        return;
      }

      toast.success("Concordance test submitted");
      setCaseId("");
      setScore1("");
      setScore2("");
      setScore3("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Concordance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Avg Concordance</p>
              <p className={`text-2xl font-bold ${concordanceColor(initialSummary.avg_concordance)}`}>
                {(initialSummary.avg_concordance * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold">{initialSummary.total_tests}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
              <Badge variant={recommendationVariant(initialSummary.recommendation)}>
                {recommendationLabel(initialSummary.recommendation)}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Concordance = 1 - (stdev / 2.0). Threshold for promotion: avg &ge; 0.90 with &ge; 10 tests.
          </p>
        </CardContent>
      </Card>

      {/* Individual tests */}
      {initialTests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Individual Tests</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Scores</TableHead>
                <TableHead>Concordance</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTests.map((t) => {
                const scores = parseScores(t.scores);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.case_id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      [{scores.join(", ")}]
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${concordanceColor(t.concordance_score)}`}>
                        {(t.concordance_score * 100).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Separator />

      {/* Submit form */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Submit Concordance Test</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Run the same rubric on the same case 3 times independently and record the scores.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="case_id">Case ID</Label>
            <Input
              id="case_id"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g. case_001 or golden-set-case-id"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="score1">Score 1 (1–5)</Label>
              <Input
                id="score1"
                type="number"
                min={1}
                max={5}
                step={1}
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score2">Score 2 (1–5)</Label>
              <Input
                id="score2"
                type="number"
                min={1}
                max={5}
                step={1}
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score3">Score 3 (1–5)</Label>
              <Input
                id="score3"
                type="number"
                min={1}
                max={5}
                step={1}
                value={score3}
                onChange={(e) => setScore3(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Test"}
          </Button>
        </form>
      </div>
    </div>
  );
}

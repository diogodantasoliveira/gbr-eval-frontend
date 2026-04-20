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

interface AbTest {
  id: string;
  name: string;
  rubric_a_id: string;
  rubric_b_id: string;
  status: string;
  results_a: string | null;
  results_b: string | null;
  winner: string | null;
}

interface AbTestResultsProps {
  test: AbTest;
  rubricAName: string;
  rubricBName: string;
}

function parseScores(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

export function AbTestResults({ test, rubricAName, rubricBName }: AbTestResultsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [rawA, setRawA] = useState("");
  const [rawB, setRawB] = useState("");

  const scoresA = parseScores(test.results_a);
  const scoresB = parseScores(test.results_b);
  const avgA = avg(scoresA);
  const avgB = avg(scoresB);

  function winnerVariant(side: "a" | "b"): "default" | "outline" | "secondary" {
    if (!test.winner) return "outline";
    if (test.winner === "tie") return "secondary";
    return test.winner === side ? "default" : "outline";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    function parseRaw(raw: string): number[] | null {
      try {
        const vals = raw
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number);
        if (vals.some(isNaN)) return null;
        return vals;
      } catch {
        return null;
      }
    }

    const a = parseRaw(rawA);
    const b = parseRaw(rawB);

    if (!a || !b) {
      toast.error("Enter comma- or space-separated numbers for both rubrics");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rubrics/ab-test/${test.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results_a: a, results_b: b }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit results");
        return;
      }

      toast.success("Results submitted");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{rubricAName}</span>
              <Badge variant={winnerVariant("a")}>
                {test.winner === "a" ? "Winner" : test.winner === "tie" ? "Tie" : "A"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scoresA.length > 0 ? (
              <>
                <div>
                  <span className="text-muted-foreground">Average: </span>
                  <ScoreBar value={avgA} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Min: {Math.min(...scoresA).toFixed(2)} — Max: {Math.max(...scoresA).toFixed(2)} — n={scoresA.length}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground italic text-xs">No results yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{rubricBName}</span>
              <Badge variant={winnerVariant("b")}>
                {test.winner === "b" ? "Winner" : test.winner === "tie" ? "Tie" : "B"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scoresB.length > 0 ? (
              <>
                <div>
                  <span className="text-muted-foreground">Average: </span>
                  <ScoreBar value={avgB} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Min: {Math.min(...scoresB).toFixed(2)} — Max: {Math.max(...scoresB).toFixed(2)} — n={scoresB.length}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground italic text-xs">No results yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {test.status !== "completed" && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">Submit Results</h3>
            <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="raw_a">Scores for {rubricAName} (comma-separated)</Label>
                <Input
                  id="raw_a"
                  value={rawA}
                  onChange={(e) => setRawA(e.target.value)}
                  placeholder="e.g. 4, 3, 5, 4, 4"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="raw_b">Scores for {rubricBName} (comma-separated)</Label>
                <Input
                  id="raw_b"
                  value={rawB}
                  onChange={(e) => setRawB(e.target.value)}
                  placeholder="e.g. 3, 3, 4, 3, 5"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Results"}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

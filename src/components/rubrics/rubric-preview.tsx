import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { safeJsonParse } from "@/lib/db";

interface Criterion {
  id: string;
  criterion: string;
  weight: number;
  score_anchor_low: string | null;
  score_anchor_high: string | null;
  sort_order: number;
}

interface Example {
  id: string;
  input_data: string;
  output_data: string;
  expected_score: number;
  reasoning: string | null;
  sort_order: number;
}

interface RubricPreviewProps {
  rubricText: string;
  criteria: Criterion[];
  examples: Example[];
  minScore: number;
  model: string;
}

export function RubricPreview({ rubricText, criteria, examples, minScore, model }: RubricPreviewProps) {
  const sortedCriteria = [...criteria].sort((a, b) => a.sort_order - b.sort_order);
  const sortedExamples = [...examples].sort((a, b) => a.sort_order - b.sort_order);
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline">Model: {model}</Badge>
        <Badge variant="outline">Min score: {minScore}</Badge>
        <Badge variant="outline">{criteria.length} criteria</Badge>
        <Badge variant="outline">{examples.length} examples</Badge>
      </div>

      {/* Rubric text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rubric Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          {rubricText ? (
            <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
              {rubricText}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground italic">No rubric text yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Criteria */}
      {sortedCriteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Scoring Criteria
              <span className="ml-2 font-normal text-muted-foreground">
                (total weight: {totalWeight.toFixed(2)})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedCriteria.map((c, idx) => (
              <div key={c.id} className="space-y-2">
                {idx > 0 && <Separator />}
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm flex-1">{c.criterion}</p>
                  <Badge variant="secondary" className="shrink-0 font-mono">
                    w={c.weight}
                  </Badge>
                </div>
                {(c.score_anchor_low || c.score_anchor_high) && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {c.score_anchor_low && (
                      <div className="bg-muted rounded p-2">
                        <p className="font-medium text-muted-foreground mb-1">Low (1–2)</p>
                        <p>{c.score_anchor_low}</p>
                      </div>
                    )}
                    {c.score_anchor_high && (
                      <div className="bg-muted rounded p-2">
                        <p className="font-medium text-muted-foreground mb-1">High (4–5)</p>
                        <p>{c.score_anchor_high}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Few-shot examples */}
      {sortedExamples.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Few-Shot Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {sortedExamples.map((ex, idx) => (
              <div key={ex.id} className="space-y-3">
                {idx > 0 && <Separator />}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Example {idx + 1}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Expected score: {ex.expected_score}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                    <pre className="text-xs font-mono bg-muted rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                      {JSON.stringify(safeJsonParse(ex.input_data, {}), null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                    <pre className="text-xs font-mono bg-muted rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                      {JSON.stringify(safeJsonParse(ex.output_data, {}), null, 2)}
                    </pre>
                  </div>
                </div>

                {ex.reasoning && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reasoning</p>
                    <p className="text-xs text-foreground">{ex.reasoning}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

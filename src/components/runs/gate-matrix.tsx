import { CheckCircle, AlertTriangle, XCircle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraderResult {
  grader_type: string;
  field?: string;
  passed: boolean;
  score: number;
  weight?: number;
  required?: boolean;
  details?: string;
}

interface GateMatrixProps {
  gateResult: string | null;
  taskResults: Array<{
    task_id: string;
    passed: boolean;
    score: number;
    grader_results: GraderResult[];
  }>;
}

function gateConfig(gate: string | null): {
  label: string;
  icon: React.ReactNode;
  className: string;
  bg: string;
} {
  switch (gate) {
    case "go":
      return {
        label: "GO",
        icon: <CheckCircle className="size-10" />,
        className: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
      };
    case "conditional_go":
      return {
        label: "CONDITIONAL GO",
        icon: <AlertTriangle className="size-10" />,
        className: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
      };
    case "no_go":
      return {
        label: "NO-GO",
        icon: <XCircle className="size-10" />,
        className: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
      };
    case "no_go_absolute":
      return {
        label: "NO-GO ABSOLUTE",
        icon: <AlertOctagon className="size-10" />,
        className: "text-red-800 dark:text-red-300",
        bg: "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700",
      };
    default:
      return {
        label: "UNKNOWN",
        icon: <AlertTriangle className="size-10" />,
        className: "text-muted-foreground",
        bg: "bg-muted border-border",
      };
  }
}

export function GateMatrix({ gateResult, taskResults }: GateMatrixProps) {
  const config = gateConfig(gateResult);

  // Aggregate grader stats across all task results
  const allGraders = taskResults.flatMap((tr) => tr.grader_results);
  const requiredPass = allGraders.filter((g) => g.required && g.passed).length;
  const requiredFail = allGraders.filter((g) => g.required && !g.passed).length;
  const optionalPass = allGraders.filter((g) => !g.required && g.passed).length;
  const optionalFail = allGraders.filter((g) => !g.required && !g.passed).length;

  const tasksPass = taskResults.filter((t) => t.passed).length;
  const tasksFail = taskResults.filter((t) => !t.passed).length;

  const llmGraders = allGraders.filter((g) => g.grader_type === "engineering_judge");
  const llmPass = llmGraders.filter((g) => g.passed).length;
  const llmTotal = llmGraders.length;

  return (
    <div className="space-y-4">
      {/* Large gate badge */}
      <div className={cn("flex items-center gap-4 rounded-xl border p-6", config.bg)}>
        <div className={config.className}>{config.icon}</div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Gate Result
          </p>
          <p className={cn("text-2xl font-bold tracking-tight", config.className)}>
            {config.label}
          </p>
        </div>
      </div>

      {/* Summary counts */}
      <div className={cn("grid gap-3", llmTotal > 0 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{tasksPass}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tasks Passed</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{tasksFail}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tasks Failed</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Required Graders</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {requiredPass}✓
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {requiredFail}✗
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Optional Graders</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {optionalPass}✓
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {optionalFail}✗
            </span>
          </div>
        </div>
        {llmTotal > 0 && (
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-3">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">LLM Reviews</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                {llmPass}✓
              </span>
              <span className="text-sm font-semibold text-purple-400 dark:text-purple-600">
                {llmTotal - llmPass}✗
              </span>
              <span className="text-xs text-muted-foreground">/ {llmTotal}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

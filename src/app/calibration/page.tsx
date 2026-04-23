import Link from "next/link";
import { db } from "@/db";
import {
  calibration_sessions,
  skills,
  golden_sets,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/calibration/session-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function CalibrationPage() {
  const sessions = db
    .select({
      id: calibration_sessions.id,
      skill_id: calibration_sessions.skill_id,
      golden_set_id: calibration_sessions.golden_set_id,
      annotator_1: calibration_sessions.annotator_1,
      annotator_2: calibration_sessions.annotator_2,
      status: calibration_sessions.status,
      cohens_kappa: calibration_sessions.cohens_kappa,
      started_at: calibration_sessions.started_at,
      completed_at: calibration_sessions.completed_at,
      skill_name: skills.name,
      golden_set_name: golden_sets.name,
    })
    .from(calibration_sessions)
    .leftJoin(skills, eq(calibration_sessions.skill_id, skills.id))
    .leftJoin(golden_sets, eq(calibration_sessions.golden_set_id, golden_sets.id))
    .all();

  const completed = sessions.filter((s) => s.status === "completed");
  const inProgress = sessions.filter((s) => s.status === "in_progress");

  const avgKappa =
    completed.length > 0 && completed.some((s) => s.cohens_kappa !== null)
      ? completed
          .filter((s) => s.cohens_kappa !== null)
          .reduce((sum, s) => sum + (s.cohens_kappa as number), 0) /
        completed.filter((s) => s.cohens_kappa !== null).length
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calibration"
        description="Inter-annotator agreement sessions and kappa metrics"
      >
        <Button render={<Link href="/calibration/sessions/new" />}>
          New Session
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="transition-colors hover:border-ring/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="transition-colors hover:border-ring/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {inProgress.length}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-colors hover:border-ring/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Kappa (completed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                avgKappa === null
                  ? "text-muted-foreground"
                  : avgKappa >= 0.75
                  ? "text-green-600 dark:text-green-400"
                  : avgKappa >= 0.5
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {avgKappa !== null ? avgKappa.toFixed(3) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <SessionList sessions={sessions} />
    </div>
  );
}

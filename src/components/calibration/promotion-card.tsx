"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KAPPA_THRESHOLD = 0.75;

interface PromotionCardProps {
  rubricId: string;
  rubricName: string;
  promotionStatus: string;
  skillKappa: number | null;
  skillName: string | null;
}

function kappaColorClass(kappa: number): string {
  if (kappa >= KAPPA_THRESHOLD) return "text-green-600 dark:text-green-400";
  if (kappa >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function PromotionCard({
  rubricId,
  rubricName,
  promotionStatus,
  skillKappa,
  skillName,
}: PromotionCardProps) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);

  const isPromoted = promotionStatus === "blocking";
  const canPromote =
    !isPromoted && skillKappa !== null && skillKappa >= KAPPA_THRESHOLD;

  async function handlePromote() {
    setPromoting(true);
    try {
      const res = await fetch(`/api/rubrics/${rubricId}/promote`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to promote rubric");
        return;
      }
      if (data.promoted) {
        toast.success(`Rubric "${rubricName}" promoted to blocking`);
        router.refresh();
      } else {
        toast.error(data.message ?? "Kappa below threshold");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPromoting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ArrowUpCircle className="size-4" />
          Rubric Promotion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rubric</span>
            <span className="font-medium">{rubricName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current status</span>
            <Badge variant={isPromoted ? "default" : "outline"}>
              {isPromoted ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  blocking
                </span>
              ) : (
                promotionStatus
              )}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Required kappa</span>
            <span className="font-mono font-medium">&ge; {KAPPA_THRESHOLD}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Skill kappa{skillName ? ` (${skillName})` : ""}
            </span>
            {skillKappa !== null ? (
              <span className={`font-mono font-semibold ${kappaColorClass(skillKappa)}`}>
                {skillKappa.toFixed(3)}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs italic">
                no completed sessions
              </span>
            )}
          </div>
        </div>

        {/* Progress bar toward threshold */}
        {skillKappa !== null && !isPromoted && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>threshold {KAPPA_THRESHOLD}</span>
              <span>1</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              {/* threshold marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
                style={{ left: `${KAPPA_THRESHOLD * 100}%` }}
              />
              <div
                className={`h-full rounded-full transition-all ${
                  skillKappa >= KAPPA_THRESHOLD
                    ? "bg-green-500"
                    : skillKappa >= 0.5
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, skillKappa * 100))}%` }}
              />
            </div>
          </div>
        )}

        {isPromoted ? (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            This rubric is already promoted to blocking.
          </p>
        ) : canPromote ? (
          <Button onClick={handlePromote} disabled={promoting} className="w-full">
            {promoting ? "Promoting..." : "Promote to Blocking"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {skillKappa === null
              ? "Complete a calibration session for this skill to enable promotion."
              : `Kappa must reach ${KAPPA_THRESHOLD} to promote. Current: ${skillKappa.toFixed(3)}.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

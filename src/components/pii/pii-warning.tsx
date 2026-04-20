"use client";

import { AlertTriangle } from "lucide-react";
import type { ScanResult } from "@/lib/pii/redactor";

interface PiiWarningProps {
  scan: ScanResult;
}

export function PiiWarning({ scan }: PiiWarningProps) {
  if (!scan.hasPii) return null;

  return (
    <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            PII detected in {scan.findings.length} field(s)
          </p>
          <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
            {scan.findings.map((f) => (
              <li key={f.field}>
                <code className="text-xs">{f.field}</code>
                {" — "}
                {f.patterns.join(", ")}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
            PII will be automatically redacted on export.
          </p>
        </div>
      </div>
    </div>
  );
}

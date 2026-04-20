import { NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contract_versions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { isValidId } from "@/lib/validations/params";

interface DriftedContract {
  contract_id: string;
  service_name: string;
  endpoint: string;
  current_version: number;
  fields_added: string[];
  fields_removed: string[];
  fields_changed: string[];
}

interface DriftResult {
  checked: number;
  drifted: DriftedContract[];
}

function flattenKeys(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v as Record<string, unknown>, key));
    } else {
      result[key] = JSON.stringify(v);
    }
  }
  return result;
}

function diffSchemas(
  current: Record<string, unknown>,
  previous: Record<string, unknown>
): { added: string[]; removed: string[]; changed: string[] } {
  const curr = flattenKeys(current);
  const prev = flattenKeys(previous);

  const currKeys = new Set(Object.keys(curr));
  const prevKeys = new Set(Object.keys(prev));

  const added = [...currKeys].filter((k) => !prevKeys.has(k));
  const removed = [...prevKeys].filter((k) => !currKeys.has(k));
  const changed = [...currKeys].filter(
    (k) => prevKeys.has(k) && curr[k] !== prev[k]
  );

  return { added, removed, changed };
}

export async function POST(req: Request) {
  try {
    let contractId: string | null = null;

    try {
      const body = await req.json();
      contractId = body?.contract_id ?? null;
    } catch {
      // no body — check all
    }

    if (contractId && !isValidId(contractId)) {
      return NextResponse.json({ error: "Invalid contract_id format" }, { status: 400 });
    }

    let rows;
    if (contractId) {
      rows = db
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, contractId), eq(contracts.status, "active")))
        .all();
    } else {
      rows = db
        .select()
        .from(contracts)
        .where(eq(contracts.status, "active"))
        .all();
    }

    const drifted: DriftedContract[] = [];

    for (const contract of rows) {
      // Get the previous version (version - 1)
      const prevVersion = db
        .select()
        .from(contract_versions)
        .where(
          and(
            eq(contract_versions.contract_id, contract.id),
            eq(contract_versions.version, contract.version - 1)
          )
        )
        .get();

      if (!prevVersion) {
        // No previous version to compare — skip (first version, no drift possible)
        continue;
      }

      const currentSchema = safeJsonParse<Record<string, unknown>>(
        contract.schema_snapshot,
        {}
      );
      const previousSchema = safeJsonParse<Record<string, unknown>>(
        prevVersion.schema_snapshot,
        {}
      );

      const { added, removed, changed } = diffSchemas(currentSchema, previousSchema);

      if (added.length > 0 || removed.length > 0 || changed.length > 0) {
        drifted.push({
          contract_id: contract.id,
          service_name: contract.service_name,
          endpoint: contract.endpoint,
          current_version: contract.version,
          fields_added: added,
          fields_removed: removed,
          fields_changed: changed,
        });
      }
    }

    const result: DriftResult = {
      checked: rows.length,
      drifted,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/contracts/check-drift error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

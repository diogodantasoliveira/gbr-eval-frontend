import { NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contract_versions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { safeJsonParse } from "@/lib/db";
import { isValidId } from "@/lib/validations/params";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const contract = db.select().from(contracts).where(eq(contracts.id, id)).get();
    if (!contract) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const versions = db
      .select()
      .from(contract_versions)
      .where(eq(contract_versions.contract_id, id))
      .orderBy(desc(contract_versions.version))
      .all();

    return NextResponse.json(
      versions.map((v) => ({
        ...v,
        schema_snapshot: safeJsonParse(v.schema_snapshot, {}),
        diff_from_previous: v.diff_from_previous
          ? safeJsonParse(v.diff_from_previous, null)
          : null,
      }))
    );
  } catch (err) {
    console.error("GET /api/contracts/[id]/versions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

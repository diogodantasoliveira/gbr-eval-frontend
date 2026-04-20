import { NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contract_versions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { updateContractSchema } from "@/lib/validations/contract";
import { toJson, safeJsonParse } from "@/lib/db";
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

    return NextResponse.json({
      ...contract,
      schema_snapshot: safeJsonParse(contract.schema_snapshot, {}),
    });
  } catch (err) {
    console.error("GET /api/contracts/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db.select().from(contracts).where(eq(contracts.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = Date.now();
    const d = parsed.data;

    const updates: Record<string, unknown> = { updated_at: now };

    // Only snapshot + bump version when schema_snapshot is being updated
    if (d.schema_snapshot !== undefined) {
      updates.schema_snapshot = toJson(d.schema_snapshot);
      updates.version = existing.version + 1;
    }

    if (d.service_name !== undefined) updates.service_name = d.service_name;
    if (d.endpoint !== undefined) updates.endpoint = d.endpoint;
    if (d.method !== undefined) updates.method = d.method;
    if (d.source_commit !== undefined) updates.source_commit = d.source_commit;
    if (d.status !== undefined) updates.status = d.status;

    db.transaction((tx) => {
      if (d.schema_snapshot !== undefined) {
        tx.insert(contract_versions)
          .values({
            id: uuidv4(),
            contract_id: id,
            version: existing.version,
            schema_snapshot: existing.schema_snapshot,
            diff_from_previous: null,
            imported_at: now,
            imported_by: "system",
          })
          .run();
      }
      tx.update(contracts).set(updates).where(eq(contracts.id, id)).run();
    });

    const updated = db.select().from(contracts).where(eq(contracts.id, id)).get();
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json({
      ...updated,
      schema_snapshot: safeJsonParse(updated.schema_snapshot, {}),
    });
  } catch (err) {
    console.error("PUT /api/contracts/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const existing = db.select().from(contracts).where(eq(contracts.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    db.delete(contracts).where(eq(contracts.id, id)).run();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/contracts/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

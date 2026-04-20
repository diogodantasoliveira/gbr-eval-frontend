import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubrics, rubric_versions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

    const rubric = db.select().from(rubrics).where(eq(rubrics.id, id)).get();
    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    const versions = db
      .select()
      .from(rubric_versions)
      .where(eq(rubric_versions.rubric_id, id))
      .orderBy(desc(rubric_versions.version))
      .all();

    return NextResponse.json(versions);
  } catch (err) {
    console.error("GET /api/rubrics/[id]/versions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

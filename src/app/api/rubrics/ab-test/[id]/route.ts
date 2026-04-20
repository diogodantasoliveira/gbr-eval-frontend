import { NextResponse } from "next/server";
import { db } from "@/db";
import { rubric_ab_tests } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const test = db.select().from(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).get();
    if (!test) {
      return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (err) {
    console.error("GET /api/rubrics/ab-test/[id] error:", err instanceof Error ? err.message : "Unknown error");
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

    const test = db.select().from(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).get();
    if (!test) {
      return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
    }

    db.delete(rubric_ab_tests).where(eq(rubric_ab_tests.id, id)).run();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/rubrics/ab-test/[id] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

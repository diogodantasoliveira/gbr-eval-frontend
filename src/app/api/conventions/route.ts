import { NextResponse } from "next/server";
import { db } from "@/db";
import { convention_rules } from "@/db/schema";
import { eq, and, sql, SQL } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createConventionSchema } from "@/lib/validations/convention";
import { isValidRegex } from "@/lib/validations/regex";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions: SQL[] = [];
    if (category) conditions.push(eq(convention_rules.category, category));
    if (severity) conditions.push(eq(convention_rules.severity, severity));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` })
      .from(convention_rules)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select()
      .from(convention_rules)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ data: rows, total });
  } catch (err) {
    console.error("GET /api/conventions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createConventionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Validate regex pattern if detection_type is "regex"
    if (parsed.data.detection_type === "regex" && parsed.data.detection_pattern) {
      const regexCheck = isValidRegex(parsed.data.detection_pattern);
      if (!regexCheck.valid) {
        return NextResponse.json(
          { error: regexCheck.error },
          { status: 400 }
        );
      }
    }

    const existing = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.name, parsed.data.name))
      .get();
    if (existing) {
      return NextResponse.json(
        { error: "Convention rule name already exists" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const id = uuidv4();

    db.insert(convention_rules)
      .values({
        id,
        name: parsed.data.name,
        category: parsed.data.category,
        severity: parsed.data.severity,
        description: parsed.data.description ?? "",
        detection_pattern: parsed.data.detection_pattern ?? "",
        detection_type: parsed.data.detection_type,
        positive_example: parsed.data.positive_example ?? "",
        negative_example: parsed.data.negative_example ?? "",
        source: parsed.data.source ?? "",
        status: "active",
        created_at: now,
        updated_at: now,
      })
      .run();

    const created = db
      .select()
      .from(convention_rules)
      .where(eq(convention_rules.id, id))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/conventions error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

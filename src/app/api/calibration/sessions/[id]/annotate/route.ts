import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  calibration_sessions,
  calibration_annotations,
  calibration_disagreements,
  golden_set_cases,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createAnnotationSchema } from "@/lib/validations/calibration";
import { safeJsonParse, toJson } from "@/lib/db";
import { redactRecord, redactString } from "@/lib/pii/redactor";
import { isValidId } from "@/lib/validations/params";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const session = db
      .select()
      .from(calibration_sessions)
      .where(eq(calibration_sessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Session is already completed" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = createAnnotationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { case_id, annotator, annotations } = parsed.data;

    // Verify the case belongs to this session's golden set
    const caseRow = db
      .select()
      .from(golden_set_cases)
      .where(
        and(
          eq(golden_set_cases.id, case_id),
          eq(golden_set_cases.golden_set_id, session.golden_set_id)
        )
      )
      .get();

    if (!caseRow) {
      return NextResponse.json(
        { error: "case_id not found in this session's golden set" },
        { status: 422 }
      );
    }

    // Check annotator is one of the session's annotators
    if (annotator !== session.annotator_1 && annotator !== session.annotator_2) {
      return NextResponse.json(
        { error: "Annotator is not part of this session" },
        { status: 422 }
      );
    }

    // Check if this annotator already submitted for this case
    const existing = db
      .select()
      .from(calibration_annotations)
      .where(
        and(
          eq(calibration_annotations.session_id, id),
          eq(calibration_annotations.case_id, case_id),
          eq(calibration_annotations.annotator, annotator)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "Annotator already submitted for this case" },
        { status: 409 }
      );
    }

    const now = Date.now();
    const annotationId = uuidv4();

    // Check if both annotators have submitted for this case → auto-detect disagreements
    const otherAnnotator =
      annotator === session.annotator_1 ? session.annotator_2 : session.annotator_1;

    const otherAnnotation = db
      .select()
      .from(calibration_annotations)
      .where(
        and(
          eq(calibration_annotations.session_id, id),
          eq(calibration_annotations.case_id, case_id),
          eq(calibration_annotations.annotator, otherAnnotator)
        )
      )
      .get();

    db.transaction((tx) => {
      tx.insert(calibration_annotations)
        .values({
          id: annotationId,
          session_id: id,
          case_id,
          annotator,
          annotations: toJson(annotations),
          created_at: now,
          is_blind: 1,
        })
        .run();

      if (otherAnnotation) {
        // Both annotators submitted — compare field by field
        const ann1Raw =
          annotator === session.annotator_1
            ? annotations
            : safeJsonParse<Record<string, unknown>>(otherAnnotation.annotations, {});
        const ann2Raw =
          annotator === session.annotator_2
            ? annotations
            : safeJsonParse<Record<string, unknown>>(otherAnnotation.annotations, {});

        const fields = new Set([...Object.keys(ann1Raw), ...Object.keys(ann2Raw)]);

        for (const field of fields) {
          const v1 = String(ann1Raw[field] ?? "");
          const v2 = String(ann2Raw[field] ?? "");
          if (v1 !== v2) {
            tx.insert(calibration_disagreements)
              .values({
                id: uuidv4(),
                session_id: id,
                case_id,
                field_name: field,
                annotator_1_value: redactString(v1).value,
                annotator_2_value: redactString(v2).value,
              })
              .run();
          }
        }
      }
    });

    const created = db
      .select()
      .from(calibration_annotations)
      .where(eq(calibration_annotations.id, annotationId))
      .get();

    const responseData = created
      ? {
          ...created,
          annotations: JSON.stringify(
            redactRecord(safeJsonParse<Record<string, unknown>>(created.annotations, {}))
          ),
        }
      : created;

    return NextResponse.json(responseData, { status: 201 });
  } catch (err) {
    console.error("POST /api/calibration/sessions/[id]/annotate error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

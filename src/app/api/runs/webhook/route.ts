import { timingSafeEqual, createHash } from "crypto";
import { NextResponse } from "next/server";
import { importRunIntoDb } from "@/lib/runs/import-run";

export async function POST(req: Request) {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenHash = createHash("sha256").update(token).digest();
    const secretHash = createHash("sha256").update(secret).digest();
    if (!timingSafeEqual(tokenHash, secretHash)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const run = await importRunIntoDb(body, "ci");
    return NextResponse.json({ run_id: run.id, imported: true }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("DUPLICATE:")) {
      return NextResponse.json({ error: "Duplicate run" }, { status: 409 });
    }
    if (err instanceof Error && err.message.startsWith("VALIDATION:")) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }
    console.error("POST /api/runs/webhook error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contract_versions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { importOpenApiSchema } from "@/lib/validations/contract";
import { toJson } from "@/lib/db";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const ALLOWED_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE"];

function normalizeMethod(m: string): HttpMethod | null {
  const upper = m.toUpperCase();
  if (ALLOWED_METHODS.includes(upper as HttpMethod)) return upper as HttpMethod;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = importOpenApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { spec, service_name } = parsed.data;
    const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;

    if (!paths || typeof paths !== "object") {
      return NextResponse.json(
        { error: "OpenAPI spec must contain a 'paths' object" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const imported: string[] = [];

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      for (const [methodRaw, operation] of Object.entries(pathItem)) {
        const method = normalizeMethod(methodRaw);
        if (!method) continue;

        // Extract response schema from the operation
        let schemaSnapshot: Record<string, unknown> = {};
        const op = operation as Record<string, unknown>;
        const responses = op.responses as Record<string, unknown> | undefined;
        if (responses) {
          // Try 200 response first, then any 2xx
          const successKey = Object.keys(responses).find(
            (k) => k === "200" || k.startsWith("2")
          );
          if (successKey) {
            const response = responses[successKey] as Record<string, unknown>;
            const content = response?.content as Record<string, unknown> | undefined;
            if (content) {
              const jsonContent = content["application/json"] as Record<string, unknown> | undefined;
              if (jsonContent?.schema) {
                schemaSnapshot = jsonContent.schema as Record<string, unknown>;
              }
            }
          }
        }

        // Include request body schema if present
        const requestBody = op.requestBody as Record<string, unknown> | undefined;
        if (requestBody) {
          const content = requestBody.content as Record<string, unknown> | undefined;
          if (content) {
            const jsonContent = content["application/json"] as Record<string, unknown> | undefined;
            if (jsonContent?.schema) {
              schemaSnapshot = {
                ...schemaSnapshot,
                requestBody: jsonContent.schema,
              };
            }
          }
        }

        // Check for existing contract with same (service_name, endpoint, method)
        const existingContract = db
          .select()
          .from(contracts)
          .where(
            and(
              eq(contracts.service_name, service_name),
              eq(contracts.endpoint, path),
              eq(contracts.method, method)
            )
          )
          .get();

        if (existingContract) {
          db.transaction((tx) => {
            // Create version snapshot before updating
            tx.insert(contract_versions)
              .values({
                id: uuidv4(),
                contract_id: existingContract.id,
                version: existingContract.version,
                schema_snapshot: existingContract.schema_snapshot,
                imported_at: now,
                imported_by: "openapi-import",
              })
              .run();

            // Update existing contract with new schema and bumped version
            tx.update(contracts)
              .set({
                schema_snapshot: toJson(schemaSnapshot),
                version: existingContract.version + 1,
                updated_at: now,
              })
              .where(eq(contracts.id, existingContract.id))
              .run();
          });

          imported.push(`${method} ${path} (updated v${existingContract.version + 1})`);
        } else {
          const id = uuidv4();
          db.insert(contracts)
            .values({
              id,
              service_name,
              endpoint: path,
              method,
              schema_snapshot: toJson(schemaSnapshot),
              version: 1,
              source_commit: "",
              status: "active",
              created_at: now,
              updated_at: now,
            })
            .run();

          imported.push(`${method} ${path}`);
        }
      }
    }

    return NextResponse.json({ imported: imported.length, endpoints: imported }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contracts/import-openapi error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

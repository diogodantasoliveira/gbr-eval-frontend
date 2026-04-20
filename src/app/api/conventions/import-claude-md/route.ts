import { NextResponse } from "next/server";
import { db } from "@/db";
import { convention_rules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// The 18 pre-defined engineering convention rules from gbr-engines CLAUDE.md
const PREDEFINED_RULES = [
  {
    name: "bff_atom_headers",
    category: "tenant_isolation",
    severity: "critical",
    detection_type: "regex",
    description:
      "BFF routes must use atomHeaders() for ATOM service calls, never serviceAuthKey(). Ensures proper tenant isolation.",
    detection_pattern: "serviceAuthKey\\(",
    positive_example: "const headers = atomHeaders(req);",
    negative_example: "const headers = { Authorization: serviceAuthKey() };",
    source: "gbr-engines CLAUDE.md #1",
  },
  {
    name: "client_credentials_include",
    category: "api_design",
    severity: "high",
    detection_type: "regex",
    description:
      "Client-side fetch calls must always include credentials: 'include' to forward session cookies.",
    detection_pattern: "fetch\\([^)]+\\)(?!.*credentials:\\s*['\"]include['\"])",
    positive_example: "fetch('/api/data', { credentials: 'include' })",
    negative_example: "fetch('/api/data', { method: 'POST' })",
    source: "gbr-engines CLAUDE.md #2",
  },
  {
    name: "paginated_response_check",
    category: "data_handling",
    severity: "medium",
    detection_type: "regex",
    description:
      "Paginated responses must be handled with Array.isArray check before accessing data property.",
    detection_pattern: "\\.data\\b(?!.*Array\\.isArray)",
    positive_example: "Array.isArray(json) ? json : (json?.data ?? [])",
    negative_example: "const items = json.data;",
    source: "gbr-engines CLAUDE.md #3",
  },
  {
    name: "turbopack_cache_clear",
    category: "architecture",
    severity: "low",
    detection_type: "llm_judge",
    description:
      "After editing frontend files, Turbopack cache must be cleared with rm -rf .next to avoid stale builds.",
    detection_pattern: "",
    positive_example: "rm -rf .next && pnpm dev",
    negative_example: "pnpm dev (without clearing .next after config changes)",
    source: "gbr-engines CLAUDE.md #4",
  },
  {
    name: "dark_mode_variants",
    category: "architecture",
    severity: "medium",
    detection_type: "regex",
    description:
      "Dark mode must always use semantic token variants (dark: prefix). Zero numeric color values allowed.",
    detection_pattern: "(?:bg|text|border)-(?:gray|zinc|slate|neutral)-\\d+(?![^{]*dark:)",
    positive_example: "className=\"bg-background text-foreground dark:bg-muted\"",
    negative_example: "className=\"bg-gray-100 text-gray-900\"",
    source: "gbr-engines CLAUDE.md #5",
  },
  {
    name: "fastapi_fixed_before_param",
    category: "api_design",
    severity: "high",
    detection_type: "ast",
    description:
      "FastAPI routes with fixed paths must be declared before parameterized routes to avoid routing conflicts.",
    detection_pattern: "",
    positive_example: "@router.get('/import')\n@router.get('/{id}')",
    negative_example: "@router.get('/{id}')\n@router.get('/import')",
    source: "gbr-engines CLAUDE.md #6",
  },
  {
    name: "db_create_if_not_exists",
    category: "data_handling",
    severity: "medium",
    detection_type: "regex",
    description:
      "All CREATE TABLE statements in local DB setup must use IF NOT EXISTS to be idempotent.",
    detection_pattern: "CREATE TABLE(?!\\s+IF\\s+NOT\\s+EXISTS)",
    positive_example: "CREATE TABLE IF NOT EXISTS users (...)",
    negative_example: "CREATE TABLE users (...)",
    source: "gbr-engines CLAUDE.md #7",
  },
  {
    name: "billing_api_prefix",
    category: "api_design",
    severity: "high",
    detection_type: "regex",
    description:
      "Billing routes must include /api/v1 prefix in include_router calls.",
    detection_pattern: "include_router\\(billing_router(?!.*prefix=[\"|']/api/v1)",
    positive_example: "app.include_router(billing_router, prefix='/api/v1')",
    negative_example: "app.include_router(billing_router)",
    source: "gbr-engines CLAUDE.md #8",
  },
  {
    name: "correct_cd_before_command",
    category: "architecture",
    severity: "medium",
    detection_type: "llm_judge",
    description:
      "Must cd to correct service directory before running pnpm or uv commands to avoid running in wrong context.",
    detection_pattern: "",
    positive_example: "cd services/frontend && pnpm install",
    negative_example: "pnpm install (from repo root)",
    source: "gbr-engines CLAUDE.md #9",
  },
  {
    name: "provider_action_slug",
    category: "naming",
    severity: "high",
    detection_type: "llm_judge",
    description:
      "provider_action must be the slug of the adapter, NOT the SOAP action name.",
    detection_pattern: "",
    positive_example: "provider_action = 'onr_consulta_matricula'",
    negative_example: "provider_action = 'ConsultaMatriculaRequest'",
    source: "gbr-engines CLAUDE.md #10",
  },
  {
    name: "no_hardcoded_business_data",
    category: "data_handling",
    severity: "critical",
    detection_type: "llm_judge",
    description:
      "Business data (enums, IDs, configuration that admin should control) must never be hardcoded. Use DB + API.",
    detection_pattern: "",
    positive_example: "const roles = await fetchRoles();",
    negative_example: "const ROLES = ['admin', 'viewer', 'analyst'];",
    source: "gbr-engines CLAUDE.md #11",
  },
  {
    name: "user_role_varchar",
    category: "data_handling",
    severity: "critical",
    detection_type: "regex",
    description:
      "user.role is VARCHAR (not enum). Must use .role directly, never .role.value.",
    detection_pattern: "\\.role\\.value\\b",
    positive_example: "if (user.role === 'admin')",
    negative_example: "if (user.role.value === 'admin')",
    source: "gbr-engines CLAUDE.md #12",
  },
  {
    name: "jwt_custom_roles_claim",
    category: "security",
    severity: "critical",
    detection_type: "regex",
    description:
      "JWT claim for roles in ATOM is 'custom:roles', NOT 'role'. Must read payload['custom:roles'].",
    detection_pattern: "payload\\[['\"]role['\"]\\](?!.*custom)",
    positive_example: "const roles = payload['custom:roles'];",
    negative_example: "const roles = payload['role'];",
    source: "gbr-engines CLAUDE.md #13",
  },
  {
    name: "bff_ports_services_md",
    category: "architecture",
    severity: "high",
    detection_type: "llm_judge",
    description:
      "BFF port defaults must always be verified against SERVICES.md before hardcoding.",
    detection_pattern: "",
    positive_example: "// Port 8003 — verified against SERVICES.md",
    negative_example: "const BACKEND_URL = 'http://localhost:8000'; // assumed port",
    source: "gbr-engines CLAUDE.md #14",
  },
  {
    name: "middleware_exclude_api",
    category: "security",
    severity: "high",
    detection_type: "regex",
    description:
      "Middleware redirect-to-login must always exclude /api/* routes. BFF routes authenticate via cookies.",
    detection_pattern: "matcher.*(?<!api).*redirect.*login|redirect.*login.*(?!.*\\/api)",
    positive_example: "matcher: ['/((?!api|_next).*)']",
    negative_example: "matcher: ['/((?!_next).*)']",
    source: "gbr-engines CLAUDE.md #15",
  },
  {
    name: "curl_before_done",
    category: "architecture",
    severity: "medium",
    detection_type: "llm_judge",
    description:
      "Never declare a feature 'done' without a real curl of the endpoint. TypeCheck passing is not sufficient.",
    detection_pattern: "",
    positive_example: "curl -X POST http://localhost:8000/api/v1/endpoint -d '{}'",
    negative_example: "pnpm type-check passes, feature is done",
    source: "gbr-engines CLAUDE.md #16",
  },
  {
    name: "secrets_scan_new_repo",
    category: "security",
    severity: "high",
    detection_type: "llm_judge",
    description:
      "Must run trufflehog/gitleaks scan when starting work on a new repo to detect committed secrets.",
    detection_pattern: "",
    positive_example: "trufflehog git file://. --since-commit HEAD~10",
    negative_example: "Starting work without secrets scan",
    source: "gbr-engines CLAUDE.md #17",
  },
  {
    name: "verify_endpoint_exists",
    category: "architecture",
    severity: "high",
    detection_type: "llm_judge",
    description:
      "Before building frontend features with fetch, verify the backend endpoint actually exists.",
    detection_pattern: "",
    positive_example: "# Confirmed: GET /api/v1/users exists in users/router.py",
    negative_example: "fetch('/api/v1/users') // backend endpoint not yet verified",
    source: "gbr-engines CLAUDE.md #18",
  },
] as const;

export async function POST(req: Request) {
  try {
    // Accept optional content for future extensibility, but seed the 18 pre-defined rules
    await req.json().catch(() => ({}));

    const now = Date.now();
    let created = 0;
    let skipped = 0;
    const results: Array<{ name: string; status: "created" | "skipped" }> = [];

    db.transaction((tx) => {
      for (const rule of PREDEFINED_RULES) {
        const existing = tx
          .select()
          .from(convention_rules)
          .where(eq(convention_rules.name, rule.name))
          .get();

        if (existing) {
          skipped++;
          results.push({ name: rule.name, status: "skipped" });
          continue;
        }

        tx.insert(convention_rules)
          .values({
            id: uuidv4(),
            name: rule.name,
            category: rule.category,
            severity: rule.severity,
            description: rule.description,
            detection_pattern: rule.detection_pattern,
            detection_type: rule.detection_type,
            positive_example: rule.positive_example,
            negative_example: rule.negative_example,
            source: rule.source,
            status: "active",
            created_at: now,
            updated_at: now,
          })
          .run();

        created++;
        results.push({ name: rule.name, status: "created" });
      }
    });

    return NextResponse.json({ created, skipped, results });
  } catch (err) {
    console.error("POST /api/conventions/import-claude-md error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

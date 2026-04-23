<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project rules

- **proxy.ts, NOT middleware.ts** — Next 16 renamed the convention. `src/proxy.ts` handles auth and rate limiting.
- **Zod v4** — This project uses `zod@^4.x`. Do NOT use Zod v3 patterns (`.refine()`, `.transform()`). Use `.check()` and the v4 API.
- **@base-ui/react** — UI primitives come from `@base-ui/react`, NOT `@radix-ui`. Imports: `import { Dialog } from "@base-ui/react/dialog"`.
- **Port 3002** — Hardcoded in package.json scripts. Both `dev` and `start` use `-p 3002`.
- **SQLite + Drizzle** — Schema in `src/db/schema.ts` (24 tables). Use `pnpm db:push` to apply changes. Synchronous queries in server components.
- **Tailwind v4** — OKLCH color tokens. Always provide `dark:` variants. Use semantic tokens (`bg-background`) not raw colors (`bg-gray-100`).

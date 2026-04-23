@AGENTS.md

# gbr-eval-frontend

Admin panel for the gbr-eval quality framework. Local-first SQLite + Next.js 16.

## Stack
- **Runtime:** Next.js 16.2 (App Router, Turbopack), React 19, TypeScript
- **DB:** SQLite via better-sqlite3 + Drizzle ORM (WAL mode, FK enforced)
- **UI:** @base-ui/react primitives + Tailwind v4 (OKLCH tokens)
- **Validation:** Zod v4 (NOT v3 — different API)
- **Port:** Fixed at **3002** (in package.json scripts, never change)

## Key files
- `src/proxy.ts` — Next 16 proxy (replaces middleware.ts). Timing-safe auth, rate limit.
- `src/db/schema.ts` — 24 tables, single source of truth for DB schema.
- `src/db/index.ts` — SQLite client with WAL + FK pragmas.
- `scripts/seed.ts` — Idempotent seed (5 P0 skills + field schemas).

## Patterns
- **API routes:** All under `src/app/api/`, protected by proxy.ts auth.
- **Pages:** Server components by default. Client components only when interactivity needed ("use client").
- **Forms:** Inline validation with `FormField` wrapper + `aria-invalid`. Zod v4 for server-side.
- **Lists:** Client-side pagination via `usePagination` hook + `Pagination` component.
- **DB access:** Synchronous `db.select()...get()` / `.all()` in server components. No ORM abstraction layer.
- **Dark mode:** Always use semantic tokens (`bg-background`, `text-foreground`). Never hardcode colors without `dark:` variant.

## Commands
```bash
pnpm dev              # port 3002
pnpm build            # production build
pnpm type-check       # tsc --noEmit
pnpm test             # vitest (unit)
pnpm db:push          # apply schema (primary workflow)
pnpm db:seed          # seed P0 skills
```

## Don'ts
- Don't use `middleware.ts` — Next 16 renamed it to `proxy.ts`.
- Don't use Zod v3 API — this project uses Zod v4 (`.check()` not `.refine()`).
- Don't hardcode port — it's 3002 in package.json scripts.
- Don't use `npm` or `yarn` — pnpm only.
- Don't create `src/db/migrations/` — use `pnpm db:push` for development.

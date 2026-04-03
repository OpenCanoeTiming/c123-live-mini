# AI work log — c123-live-mini

Purpose: short-lived memory for agents and humans. Read **Current conventions** and recent **Log** entries before substantive edits; append after meaningful changes.

## Current conventions

- **Stack & constraints:** Monorepo: Fastify + Vite + SQLite + `@czechcanoe/rvp-design-system` (GitHub Packages). Do not treat this repo as Next.js / kresicds.
- **Secrets:** Never log or commit `.env`, API keys, or `MASTER_PASSWORDS` values.
- **Git:** User runs `commit`/`push` unless they explicitly ask the agent to commit; see `.cursor/rules/git-commits.mdc`.

## Log (newest first)

### 2026-04-04 — Issue #117: Docker, Railway config-as-code, README deployment

- **What:** Root multi-stage `Dockerfile` (Node 20 bookworm builder + slim runner, BuildKit secret `npm_token` for `npm ci`, prune dev deps, non-root user, `CMD node packages/server/dist/index.js`); `.dockerignore`; `railway.toml` (`DOCKERFILE`, start command, `/health` healthcheck); README **Deployment** (local prod smoke, Docker build/run, Railway env + build secret, `DATABASE_PATH` vs `DATABASE_URL`, SQLite-on-Railway options A/B/C with recommendation, manual smoke checklist, upstream PR note for `Closes #117`).
- **Why:** Close remaining packaging/docs items for [issue #117](https://github.com/OpenCanoeTiming/c123-live-mini/issues/117); reproducible image with GitHub Packages auth at build only; operators use README as entry point.
- **Do not undo:** Do not remove the `npm_token` mount from the Dockerfile without an alternative way to install `@czechcanoe/*` from GitHub Packages in CI/Railway. Keep `railway.toml` healthcheck aligned with `GET /health`.
- **Also:** `ViewModeToggle.tsx` — `Switch` `onChange` is typed as `ChangeEvent<HTMLElement>` or `(id: string) => void`; handler uses `HTMLElement` + `HTMLInputElement` guard so `tsc --noEmit` passes.

### 2026-04-04 — Git: ignore `.cursor/` and `vendor/`; public client uses registry DS

- **What:** `.gitignore` adds `.cursor/` and `vendor/`; `packages/client` depends on `@czechcanoe/rvp-design-system` `latest` again; `.npmrc.example` for GitHub Packages; root `typescript` set to `~5.7.3`.
- **Why:** Upstream should not ship Cursor config or local `vendor` stubs; contributors authenticate per `.npmrc.example`.

### 2026-04-04 — Client build: CSS module typings + exclude Vitest setup

- **What:** `vite-env.d.ts` declares `*.module.css`; `tsconfig.json` excludes `src/test-setup.ts`; `build` script uses `tsc --noEmit` instead of `tsc -b`.
- **Why:** App `tsc` must not pull Vitest/testing-library; CSS modules need ambient declarations; single non-composite project does not need `tsc -b`.

### 2026-04-04 — Client TS: Vite env types without `compilerOptions.types`

- **What:** Removed `types: ["vite/client"]` from `packages/client/tsconfig.json`; added `packages/client/src/vite-env.d.ts` with `/// <reference types="vite/client" />`.
- **Why:** Forcing only `vite/client` via `types` triggers TS2688 when resolution/hoisting does not expose that entry; the reference file matches the default Vite + TypeScript setup and keeps `import.meta.env` typings.

### 2026-04-04 — Fix Node production resolution for `shared` + exclude tests from `tsc` emit

- **What:** `packages/shared/package.json` `main`/`exports` now point at compiled `dist/*.js` (not `./src/index.ts`). `packages/shared/tsconfig.json` and `packages/server/tsconfig.json` exclude `*.test.ts` / `*.spec.ts` from compilation so `npm run build -w …` succeeds without Vitest types in those packages.
- **Why:** `node packages/server/dist/index.js` must resolve `@c123-live-mini/shared` to JS; exporting TS source broke runtime. Test files must not be part of emit graph for package builds.
- **Do not undo:** After pulling, run `npm run build -w @c123-live-mini/shared` before `npm run start` (or rely on root `npm run build`). Local `npm run dev` with `tsx` also expects built `shared` unless we add a dev export later.

### 2026-04-04 — Harden SPA notFound: API prefix + HEAD

- **What:** `registerProductionSpa.ts` — API detection uses `/api`, `/api/…` only (not `startsWith('/api')`); SPA fallback allows `HEAD`.
- **Why:** Avoid JSON 404 for static files like `/api.js`; align with normal static hosting for HEAD.

### 2026-04-04 — Phase 1: serve Vite SPA from Fastify in production

- **What:** Added `@fastify/static`, `clientDistPath.ts`, `registerProductionSpa.ts`; `createApp` is async and registers static hosting when `NODE_ENV=production` and the client `dist` exists (`CLIENT_DIST_PATH` or default `packages/client/dist`). SPA fallback serves `index.html` for non-API GETs; unknown `/api/*` returns JSON 404. Cache: long-lived immutable for hashed assets, `no-store` for `index.html`.
- **Why:** Single-origin production (REST + WS + UI) for issue #117 / Docker follow-up.
- **Do not undo:** Register static and `setNotFoundHandler` only after API and WebSocket routes so `/api` and `/health` stay authoritative.

### 2026-04-04 — Align Cursor project conventions with repo

- **What:** Replaced `.cursor/rules/project-conventions.mdc` (was a misplaced Next.js/kresicds template) with conventions matching `package.json`, `docs/ARCHITECTURE.md`, and `packages/server` / `packages/client`.
- **Why:** Cursor always-applied rules must describe this codebase so agents do not apply wrong framework patterns.
- **Do not undo:** Keep `project-conventions.mdc` scoped to **c123-live-mini**; if another project shares the workspace, use workspace-specific rules or path-scoped rules instead of reintroducing unrelated stack tables.

---

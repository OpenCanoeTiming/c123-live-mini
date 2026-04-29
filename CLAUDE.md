# Claude Code Instructions - C123 Live Mini

## Project

C123 Live Mini - minimalistic live results for canoe slalom races timed with Canoe123.

**GitHub:** OpenCanoeTiming/c123-live-mini | **License:** MIT

---

## Architecture

> **Full details:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

```
┌──────────────┐     TCP/XML     ┌──────────────┐    HTTP/JSON    ┌──────────────────┐    WS/REST    ┌─────────────┐
│  Canoe123    │ ──────────────► │  c123-server  │ ─────────────► │ live-mini-server  │ ───────────► │  live-mini   │
│  (timing)    │                 │  (local)      │                │ (cloud/Railway)   │              │  (browser)   │
└──────────────┘                 └──────────────┘                └──────────────────┘              └─────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Monorepo | npm workspaces (`packages/server`, `packages/client`) |
| Backend | Node.js 20 LTS, TypeScript 5.x strict, Fastify, Kysely, better-sqlite3 |
| Database | SQLite file-based (`packages/server/data/live-mini.db`), Repository Pattern |
| Frontend | React 18, Vite, wouter |
| Design System | @czechcanoe/rvp-design-system (public-facing) |
| Deployment | Railway (staging live, production deferred) — see `docs/RUNBOOK.md` |

---

## Key References

| Purpose | Path |
|---------|------|
| **Architecture & data flows** | `docs/ARCHITECTURE.md` |
| **Deployment runbook** (staging URL, Railway access, smoke tests, troubleshooting) | `docs/RUNBOOK.md` |
| **Post-mortems / lessons** | `DEVLOG.md` |
| **C123 protocol (XML, TCP)** | `../c123-protocol-docs/` |
| **c123-server (data source)** | `../c123-server/` |
| **Design system** | [rvp-design-system](https://github.com/CzechCanoe/rvp-design-system/) |
| **Historical specs** | `specs/` (read-only reference for features 001-010) |

---

## Important Rules

1. **Design system only** — Frontend must strictly use `@czechcanoe/rvp-design-system`. No inline styles or local overrides.
2. **Headless API** — Server has no Admin UI. Administration via c123-server.
3. **Mobile-first** — Frontend optimized for spectators on phones at the venue.

---

## Development

```bash
# Server (from project root)
npx tsx packages/server/src/index.ts

# Client (separate terminal)
cd packages/client && npx vite

# Client proxies /api → localhost:3000, /ws → localhost:3000
```

### Railway access

Railway CLI + MCP server (`@railway/mcp-server`) are wired up via `.mcp.json` (project-scoped, committed). Auth is shared with the local Railway CLI — run `railway login --browserless` once per machine to enable both.

`railway link` should point at the env you're debugging — typically `staging`. Switch with `railway environment <name>`. From the MCP server you can read logs and variables for either env without changing the link (tools take an env arg).

---

## Workflow

Every issue goes through 4 phases. **Each phase updates the issue** so progress is visible in GitHub.

### 1. Rozbor (Analysis) → comment on issue

Before any code, post an analysis comment to the issue:
- **What & why** — restate the problem in own words, confirm understanding
- **Challenge the idea** — is this the right solution? Simpler alternatives? Over-engineering risk?
- **Scope** — what's in, what's explicitly out
- **Risks & open questions** — unknowns, dependencies, edge cases
- Use `/second-opinion` for non-trivial architectural or design decisions

### 2. Plan → comment on issue

- Use Claude Code plan mode to design implementation
- **Post plan summary to the issue:** key decisions, files to change, rough approach
- For larger features: include detailed plan outline (phases, key tasks)
- Get user confirmation before starting implementation

### 3. Implement → update issue with progress

- Create branch from main
- Commit incrementally, push regularly
- **Comment on issue** with progress updates (what's done, what's next, any blockers)
- For multi-phase features: update after each phase

### 4. PR & Review → link PR to issue

- **Every issue must result in a PR** with `Closes #N`
- Run `/second-opinion` or independent sub-agent review on the PR diff before requesting human review
- Include test plan in PR description
- PR description summarizes what changed and why

### Branching

**Long-lived branches:**

| Branch | Role | Deploys to | Rules |
|---|---|---|---|
| `main` | Clean trunk, source of truth | — | Only via merged PR. Linear history preferred. |
| `staging` | WIP / experimental | Railway `staging` env | Free-for-all, force-push OK. Disposable — anything valuable must land in `main` via PR. |
| `production` | Release | Railway `production` env | Fast-forward from `main` only. |

**Feature branches** (created from `main`):

| Issue Type | Branch Pattern | Example |
|------------|----------------|---------|
| Feature | `feat/{N}-{slug}` | `feat/103-category-status` |
| Bug | `fix-{N}-{slug}` | `fix-99-ws-reconnect` |

To test something on the live staging URL before opening a PR: push the feature branch to `staging` (`git push -f origin HEAD:staging`). Don't push WIP to `main`.

---

## DEVLOG.md

Append-only record of dead ends, surprising problems, and their solutions. Strictly append — never edit or delete existing entries.

### Entry format
```markdown
## YYYY-MM-DD — Short description

**Problem:** What went wrong or didn't work
**Attempted:** What was tried
**Solution:** What actually worked (or: still open)
**Lesson:** What to remember next time
```

---

## Language

- **Communication:** Czech or English
- **Code, commits:** English
- **Documentation:** English

---

## Versioning & Releases

This project uses **Release Please** (commit-based) for automatic versioning of the whole monorepo. **Never manually bump any `package.json` version or edit `CHANGELOG.md`** — Release Please owns all of them via its rolling release PR.

### How it works

1. Every push to `main` runs `.github/workflows/release-please.yml`.
2. Release Please keeps a rolling **release PR** open (label `autorelease: pending`) that aggregates pending changes and proposes the next version.
3. release-please tracks **only the root** `c123-live-mini` package. The three workspace `package.json` files (`packages/client`, `packages/server`, `packages/shared`) and their `package-lock.json` workspace entries are bumped via `extra-files`, so all four stay on the **same version** automatically. There is one root `CHANGELOG.md` for the whole repo (per-package CHANGELOG files in `packages/*/` are frozen historical records from the pre-2026-04-29 multi-package config — not updated anymore).
4. Merging the release PR creates:
   - A commit `chore(main): release X.Y.Z` on `main` that bumps all four `package.json` files plus the matching `package-lock.json` entries
   - A single git tag `vX.Y.Z` (no per-package tag because `include-component-in-tag: false`)
   - A GitHub Release with generated CHANGELOG
5. Railway auto-deploys `main` → staging. Promoting `main` → `production` is a separate manual fast-forward.
6. `SHARED_VERSION` (shown in the client footer) reads dynamically from `packages/shared/package.json`, so it stays in sync automatically.

### Commit types and bump rules

| Commit type | Bump | Shown in CHANGELOG |
|---|---|---|
| `feat:` / `feat(client):` / `feat(server):` | **minor** (see 0.x note) | ✓ Features |
| `fix:` / `perf:` | **patch** | ✓ Bug Fixes / Performance |
| `feat!:` or `BREAKING CHANGE:` | **minor** (see 0.x note) | ✓ Features |
| `revert:` / `docs:` | none | ✓ Reverts / Documentation |
| `chore:` / `ci:` / `test:` / `style:` / `refactor:` / `build:` | **none** | hidden |
| `chore(deps):` / `chore(deps-dev):` (dependabot) | **none** | hidden |

**0.x series note:** Project is configured with `bump-minor-pre-major: true`. While in 0.x, `feat!:` bumps **minor** instead of major so breaking changes don't accidentally promote to 1.0.0. See "Graduating to 1.0.0" below.

### Rules for agents preparing PRs

1. **Always use conventional commits** (`feat:`, `fix:`, `chore:`...). Release Please reads commit prefixes to decide bumps.
2. **Don't edit any `package.json` version or `CHANGELOG.md`** in regular PRs — Release Please owns those.
3. **Use scopes sparingly and consistently.** `feat(client):`, `feat(server):`, `feat(shared):` are OK (they just show up in the changelog section header). Scopes don't change the bump rule — whole monorepo still bumps together.
4. **Don't merge the release PR together with feature PRs** — it must be the last to merge in a release cycle.
5. **PR title should keep the commit prefix** (squash merges — ensure the final merged commit stays conventional).
6. **Never commit skill state** — `.superpowers/` and `.claude/` are already in `.gitignore`. Still prefer `git add <file>` over `git add -A`.
7. **Use `packages/shared` for cross-package types** — changes there typically cause `feat:` or `fix:` depending on whether the contract changed. Runtime code in client/server consuming shared follows the same rule.

### Graduating to 1.0.0

To force a release to a specific version (e.g., graduating from 0.x to 1.0.0), add this footer to a commit in the next release cycle:

```
Release-As: 1.0.0
```

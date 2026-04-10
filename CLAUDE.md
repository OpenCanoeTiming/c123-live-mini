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

| Issue Type | Branch Pattern | Example |
|------------|----------------|---------|
| Feature | `feat/{N}-{slug}` | `feat/103-category-status` |
| Bug | `fix-{N}-{slug}` | `fix-99-ws-reconnect` |

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

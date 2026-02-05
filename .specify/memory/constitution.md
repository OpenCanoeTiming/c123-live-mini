<!--
=== Sync Impact Report ===
Version change: 1.0.0 → 1.1.0 (satellite mode requirement)
Modified principles:
  - IV. Design System Compliance: Added satellite mode as mandatory configuration
Related docs updated:
  - docs/ARCHITECTURE.md: ✅ Added Satellite Mode section
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Compatible
  - .specify/templates/spec-template.md: ✅ Compatible
  - .specify/templates/tasks-template.md: ✅ Compatible
Follow-up TODOs: None
===
-->

# c123-live-mini Constitution

## Core Principles

### I. Spec-Driven Development (SDD)

Every feature MUST follow the SDD workflow before implementation begins:

1. Feature issue created with `type/feature` + `spec/draft` labels
2. `/speckit.specify` creates branch and spec.md
3. `/speckit.clarify` refines requirements
4. `/speckit.plan` produces implementation plan
5. `/speckit.tasks` generates task list, label changes to `spec/approved`
6. Implementation proceeds phase-by-phase with issue updates

**Rationale**: Upfront specification prevents wasted effort, ensures alignment,
and creates traceable history of design decisions.

### II. GitHub Issue State Synchronization

GitHub Issues are the single source of truth for feature status. The following
MUST be enforced:

- **Label transitions are mandatory**: `spec/draft` → `spec/approved` after tasks,
  `status/wip` added at implementation start, removed before PR
- **Issue updates after every phase**: Each Spec-Kit command and implementation
  phase MUST update the Feature issue with progress, links, and next steps
- **PR closes issue**: Every PR MUST include `Closes #N` linking to its Feature issue

**Rationale**: Consistent issue state enables project tracking, async collaboration,
and audit trail of decisions.

### III. Headless API Architecture

The `c123-live-mini-server` MUST operate as a headless JSON API:

- No Admin UI in this project - administration via `c123-server`
- All configuration endpoints exposed for remote management
- Single active event per API key at any time
- API key scoped to event lifecycle (prevents cross-event data leaks)

**Rationale**: Separation of concerns allows specialized Admin UI in `c123-server`
while keeping the public-facing server minimal and focused.

### IV. Design System Compliance

Frontend (`c123-live-mini-page`) MUST strictly use `rvp-design-system`:

- **Satellite mode**: Application MUST be configured as "satellite" variant,
  capable of standalone operation outside kanoe.cz domain
- No inline styles or local CSS overrides
- Missing components: use unstyled elements and report requirement
- Mobile-first responsive design mandatory
- If component doesn't exist, file issue in rvp-design-system repo

**Rationale**: Consistent CSK brand identity across public applications,
reduced maintenance burden, unified UX. Satellite mode enables deployment
on independent domains (e.g., event-specific URLs) while maintaining brand.

### V. Repository Pattern

Database access MUST be abstracted through Repository Pattern:

- Application logic isolated from SQLite/Kysely specifics
- All database operations go through repository interfaces
- Enables future migration to different storage if needed
- Type-safe queries via Kysely

**Rationale**: Clean architecture, testability, and flexibility for future
integration with larger CSK registration portal.

### VI. Minimal Viable Scope

Implementation MUST follow YAGNI (You Aren't Gonna Need It):

- Only implement explicitly specified features
- No premature abstractions or "future-proofing"
- Bonus features (bodování, favorites) are explicitly optional in roadmap
- Complexity MUST be justified in plan's Complexity Tracking section

**Rationale**: Project is intentionally "mini" - focus on core live results
functionality before expanding scope.

## Technology Stack

| Layer | Technology | Constraint |
|-------|------------|------------|
| Runtime | Node.js 20 LTS | TypeScript 5.x strict mode |
| Backend | Fastify | Headless JSON API |
| Database | SQLite + Kysely | Repository Pattern, file-based |
| Frontend | React + Vite | rvp-design-system only |
| Monorepo | npm workspaces | packages/server, packages/page |
| Deployment | Railway | Planned |

## Development Workflow

### Branching

| Issue Type | Branch Pattern | Example |
|------------|----------------|---------|
| Feature | `###-feature-name` | `002-data-model` |
| Bug | `fix-{N}-{slug}` | `fix-99-ws-reconnect` |

### Commit Convention

- Language: English
- Format: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Scope: component name when applicable (e.g., `feat(server): add health endpoint`)

### Required Artifacts Per Feature

| Phase | Output |
|-------|--------|
| /speckit.specify | `specs/###-feature/spec.md` |
| /speckit.plan | `specs/###-feature/plan.md`, `research.md`, `data-model.md` |
| /speckit.tasks | `specs/###-feature/tasks.md` |

## Governance

### Amendment Process

1. Propose change via PR modifying this constitution
2. Document rationale in PR description
3. Update version following semver:
   - MAJOR: Principle removal or backward-incompatible redefinition
   - MINOR: New principle or significant guidance expansion
   - PATCH: Clarifications, typos, non-semantic refinements
4. Update `LAST_AMENDED_DATE` to PR merge date

### Compliance

- All PRs MUST comply with constitution principles
- Plan's "Constitution Check" section MUST pass before implementation
- Violations require explicit justification in Complexity Tracking

### Reference Documents

- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - System design, data flows
- [CLAUDE.md](../../CLAUDE.md) - Development guidance and workflow
- [PROJECT.md](../../PROJECT.md) - Original requirements and roadmap

**Version**: 1.1.0 | **Ratified**: 2026-02-05 | **Last Amended**: 2026-02-05

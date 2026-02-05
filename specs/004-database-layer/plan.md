# Implementation Plan: Database Layer

**Branch**: `004-database-layer` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-database-layer/spec.md`

## Summary

Complete the Database Layer feature by adding seed data extracted from real competition XML and creating data model documentation. Most implementation (schema, migrations, repositories) already exists from Features #2 and #3.

**Remaining scope**:
1. Seed script (`npm run seed`) using subset of `2024-LODM-fin.xml`
2. Data model documentation with ERD and XML mapping

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS
**Primary Dependencies**: Kysely, better-sqlite3 (already installed)
**Storage**: SQLite file-based (`packages/server/data/live-mini.db`)
**Testing**: Vitest (existing test setup)
**Target Platform**: Node.js server
**Project Type**: Monorepo (npm workspaces)
**Performance Goals**: Seed completes in <5 seconds
**Constraints**: Idempotent seed operation, deterministic data
**Scale/Scope**: ~20 participants, 2 classes, 2 races

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ Pass | Following SDD workflow |
| II. GitHub Issue State Sync | ✅ Pass | Issue #4 will be updated |
| III. Headless API Architecture | ✅ N/A | Seed is server-side script only |
| IV. Design System Compliance | ✅ N/A | No frontend changes |
| V. Repository Pattern | ✅ Pass | Using existing repositories |
| VI. Minimal Viable Scope | ✅ Pass | Single seed scenario, minimal docs |

**Gate Status**: PASSED

## Project Structure

### Documentation (this feature)

```text
specs/004-database-layer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (ERD + field mapping)
├── quickstart.md        # Phase 1 output (seed usage guide)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/server/
├── src/
│   ├── db/
│   │   ├── seed.ts              # NEW: Seed script entry point
│   │   └── seed-data.ts         # NEW: Extracted data from XML
│   └── ...existing...
└── package.json                  # ADD: "seed" script

docs/
└── data-model.md                 # NEW: ERD and XML mapping (FR-006, FR-007)
```

**Structure Decision**: Seed script lives in `packages/server/src/db/` alongside existing database code. Documentation goes to `docs/` for project-wide visibility.

## Complexity Tracking

No constitution violations - minimal scope feature.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| Seed data extraction | Low | Manual subset from XML, not automated parsing |
| ERD documentation | Low | Mermaid diagram from existing schema.ts |
| XML mapping | Low | Table comparing XML elements to DB columns |

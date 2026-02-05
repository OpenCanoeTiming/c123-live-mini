# Feature Specification: Database Layer

**Feature Branch**: `004-database-layer`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Database Layer - seed data and validation for existing implementation"

## Clarifications

### Session 2026-02-05

- Q: Seed data source strategy? → A: Extract subset from real XML (2024-LODM-fin.xml from c123-protocol-docs)
- Q: Include team results in seed data? → A: Individual results only (simpler, covers core scenarios)

## Implementation Status

This feature consolidates and validates the database layer that was largely implemented during Feature #2 (Protocol Analysis & Data Model) and Feature #3 (Technical PoC).

### Already Implemented

| Component | Status | Location |
|-----------|--------|----------|
| Database schema | ✅ Complete | `packages/server/src/db/schema.ts` |
| Migrations (7 tables) | ✅ Complete | `packages/server/src/db/migrations/` |
| Repository pattern | ✅ Complete | `packages/server/src/db/repositories/` |
| IngestService | ✅ Complete | `packages/server/src/services/IngestService.ts` |
| XML parsers | ✅ Complete | `packages/server/src/services/xml/` |
| OnCourse store | ✅ Complete | `packages/server/src/services/OnCourseStore.ts` |
| Auto-migrations on startup | ✅ Complete | `packages/server/src/db/database.ts` |

### Remaining Work

| Component | Status | Description |
|-----------|--------|-------------|
| Seed data | ❌ Missing | Demo data script for development and testing |
| Integration tests | ⚠️ Partial | Repository/API tests with real database |
| Data model documentation | ⚠️ Partial | ERD and field mapping docs |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Quick Start with Demo Data (Priority: P1)

A developer clones the repository and wants to immediately see the application working with realistic data. They run a single command and the system populates the database with a complete demo event including participants, races, and results.

**Why this priority**: Without seed data, every developer must manually create test data or import XML files, slowing down onboarding and testing.

**Independent Test**: Run `npm run seed` on a fresh database, then verify the API returns the demo event with all related data (participants, races, results).

**Acceptance Scenarios**:

1. **Given** a fresh database (no data), **When** running the seed command, **Then** the database contains a complete demo event with at least 20 participants and 2 races with results.
2. **Given** seeded data exists, **When** accessing the frontend, **Then** the demo event is visible and selectable with full results display.
3. **Given** seeded data exists, **When** running seed command again, **Then** data is replaced (idempotent operation) without errors.

---

### User Story 2 - Automated Testing with Predictable Data (Priority: P2)

An automated test suite needs consistent, predictable data to verify API responses and data integrity. The seed data provides known values that tests can assert against.

**Why this priority**: Reliable tests require deterministic data. Random or manually-created data makes assertions fragile.

**Independent Test**: Run test suite against seeded database and verify all data-dependent assertions pass.

**Acceptance Scenarios**:

1. **Given** seed data is loaded, **When** querying GET /api/v1/events, **Then** response contains exactly the expected demo event with known eventId.
2. **Given** seed data with known results, **When** querying results for a race, **Then** rankings, times, and penalties match expected values.
3. **Given** seed data includes multiple categories, **When** filtering by category, **Then** correct subset is returned with proper category rankings.

---

### User Story 3 - Data Model Documentation (Priority: P3)

A new team member or contributor needs to understand the database structure, entity relationships, and how XML data maps to database tables. Documentation provides this context without reading code.

**Why this priority**: Good documentation reduces onboarding time and prevents misunderstandings about data structure.

**Independent Test**: Review documentation and verify it accurately describes all tables, relationships, and the XML-to-database mapping.

**Acceptance Scenarios**:

1. **Given** the data model documentation, **When** a developer reads it, **Then** they understand all 7 tables and their relationships without reading code.
2. **Given** the XML mapping documentation, **When** comparing to actual XML files, **Then** the mapping is accurate and complete for all ingested fields.

---

### Edge Cases

- What happens when seed runs on a database with existing data? → Clears relevant tables and re-inserts (clean slate).
- What if seed data references non-existent foreign keys? → Seed script handles insertion order (events → classes → participants → races → results).
- How to handle different seed data sets? → Single canonical demo event is sufficient for MVP; extensible later if needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a seed command (`npm run seed`) that populates the database with demo data.
- **FR-002**: Seed data MUST include a complete event with: event metadata, 2 individual classes (e.g., K1M-ZS, K1W-ZS), at least 20 participants, at least 2 races (one per class), and results for all participants. Team events excluded from seed data.
- **FR-003**: Seed data MUST be extracted from real competition data (source: `c123-protocol-docs/samples/2024-LODM-fin.xml`) to ensure authentic names, clubs, times, and penalty distributions.
- **FR-004**: Seed command MUST be idempotent (safe to run multiple times).
- **FR-005**: Seed data MUST include examples of different result statuses (OK, DNS, DNF, DSQ).
- **FR-006**: Data model documentation MUST include entity-relationship diagram showing all tables and relationships.
- **FR-007**: Data model documentation MUST include XML-to-database field mapping for all ingested fields.

### Key Entities

All entities already defined and implemented in Feature #2:

- **Event**: Competition metadata (eventId, titles, location, dates, status)
- **Class**: Race category (classId, name, associated age categories)
- **Category**: Age category within class (catId, year ranges)
- **Participant**: Competitor (names, club, bib, category assignment)
- **Race**: Scheduled race (raceId, classId, disId, status)
- **Result**: Competition result (times, penalties, rankings, status)
- **Course**: Gate configuration (number of gates, gate types)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developer can set up working demo environment in under 2 minutes (clone, install, seed, run).
- **SC-002**: Seed data covers all major data scenarios (normal results, DNS/DNF/DSQ, multiple categories, multiple races).
- **SC-003**: Frontend displays seeded data correctly without manual intervention.
- **SC-004**: Data model documentation accurately describes 100% of tables and relationships.
- **SC-005**: XML field mapping documentation covers all fields currently ingested by IngestService.

## Assumptions

- Single demo event is sufficient for development and testing purposes.
- Seed data is extracted from `c123-protocol-docs/samples/2024-LODM-fin.xml` (Hry XI. letní olympiády dětí a mládeže 2024, České Budějovice) - a subset of ~20 participants and 2 classes.
- Documentation is Markdown-based and lives in the `specs/` or `docs/` directory.
- Existing migrations and schema are correct and do not need modification.

## Out of Scope

- Multiple seed data scenarios (e.g., "empty event", "large event", "cross discipline").
- Seed data for OnCourse (transient in-memory data).
- Database backup/restore utilities.
- Performance testing data (large datasets).
- Schema changes or new migrations.

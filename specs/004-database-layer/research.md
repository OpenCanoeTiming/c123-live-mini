# Research: Database Layer

**Feature**: 004-database-layer
**Date**: 2026-02-05
**Source Documentation**: [c123-protocol-docs/c123-xml-format.md](../../../c123-protocol-docs/c123-xml-format.md)

## Research Tasks

### 1. Seed Data Source Analysis

**Task**: Analyze `c123-protocol-docs/samples/2024-LODM-fin.xml` for extractable seed data, using full XML format specification from `c123-xml-format.md`.

**Findings**:

| Data Type | Count in Source | For Seed |
|-----------|-----------------|----------|
| Participants (K1M-ZS) | 26 | 10 (subset) |
| Participants (K1W-ZS) | 23 | 10 (subset) |
| Results | 1139 total | ~20 (for 2 races) |
| Classes | 34 total | 2 (K1M-ZS, K1W-ZS) |
| Statuses | DNS: 36, DNF: 90 | Include 1-2 of each |

**Decision**: Extract 10 participants per class (20 total), selecting mix of:
- Top finishers with times and penalties
- At least 1 DNS, 1 DNF per class for status coverage
- Real names, clubs, times from LODM 2024 event

**Rationale**: Real data provides authentic Czech names, valid time distributions (80-120s range), and realistic penalty patterns without manual invention.

**Alternatives Considered**:
- Synthetic data generation: Rejected - artificial names, less realistic
- Full XML subset: Rejected - 500+ participants too large for seed

### 2. Seed Script Architecture

**Task**: Determine best approach for seed script implementation.

**Decision**: Direct repository calls with hardcoded TypeScript data objects.

**Rationale**:
- Repositories already exist and are tested
- TypeScript provides type safety for seed data
- No need for XML parsing (one-time manual extraction)
- Idempotency via DELETE + INSERT pattern

**Alternatives Considered**:
- XML import via IngestService: Rejected - overkill, need subset not full file
- JSON fixtures: Rejected - less type safety, extra file management
- SQL seed file: Rejected - bypasses repository pattern

### 3. Documentation Format

**Task**: Determine ERD and mapping documentation format.

**Decision**: Mermaid diagrams in Markdown (docs/data-model.md)

**Rationale**:
- Renders in GitHub natively
- Version-controlled alongside code
- No external tools required
- Matches existing documentation approach

**Alternatives Considered**:
- Image-based ERD: Rejected - requires external tool, not versionable
- Database-generated docs: Rejected - SQLite tooling limited

## Key Data for Seed

### Event Metadata (from XML)

```
EventId: CZE2.2024062500
MainTitle: Hry XI. letní olympiády dětí a mládeže 2024
Location: České Budějovice
StartDate: 2024-06-25
```

### Target Classes

| ClassId | Name | Category |
|---------|------|----------|
| K1M-ZS | K1 Muži - Základní školy | ZS (elementary) |
| K1W-ZS | K1 Ženy - Základní školy | ZS (elementary) |

### Sample Participant Structure (K1M-ZS)

```xml
<Participants>
  <Id>9065.K1M.ZS</Id>
  <ClassId>K1M-ZS</ClassId>
  <EventBib>101</EventBib>
  <FamilyName>Novák</FamilyName>
  <GivenName>Jan</GivenName>
  <Club>USK Praha</Club>
  <CatId>ZS</CatId>
</Participants>
```

### Sample Result Structure

```xml
<Results>
  <ClassId>K1M-ZS</ClassId>
  <Id>9065.K1M.ZS</Id>
  <Time>8542</Time>        <!-- hundredths: 85.42s -->
  <Pen>200</Pen>           <!-- hundredths: 2s penalty -->
  <Total>8742</Total>      <!-- 87.42s total -->
  <Rnk>1</Rnk>
  <Gates>00000002000000000000000</Gates>
</Results>
```

## Open Questions

None - all clarifications resolved in spec.md.

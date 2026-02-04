# Research: Protocol Analysis & Data Model

**Feature**: 002-data-model | **Date**: 2026-02-04

## Executive Summary

Analysis of C123 XML format from `c123-protocol-docs` reveals a well-structured data model with 8 main sections. For live-mini, we need 6 core entities: Event, Participant, Class, Race, Result, Course. OnCourse data is transient (in-memory only).

---

## 1. XML Format Analysis

### Source Documents
- `../c123-protocol-docs/c123-xml-format.md` - Complete XML structure
- `../c123-protocol-docs/c123-protocol.md` - TCP/UDP protocol details
- Sample files: `captures/2024-LODM-fin.xml`, `captures/xboardtest02_jarni_v1.xml`

### XML Sections Mapping

| XML Section | Needed for Live | Entity | Notes |
|-------------|-----------------|--------|-------|
| `Events` | Yes | Event | Competition metadata |
| `Participants` | Yes | Participant | Athletes and teams |
| `Classes` | Yes | Class | Race categories with age groups |
| `Schedule` | Yes | Race | Race schedule and status |
| `Results` | Yes | Result | Times, penalties, rankings |
| `CourseData` | Yes | Course | Gate configuration |
| `GateStatistics` | No | - | Aggregate stats, not needed for display |
| `CompOfficials` | No | - | Judges, out of scope |

### Key XML Elements

#### Events (→ Event entity)
```
EventId, MainTitle, SubTitle, Location, Facility, StartDate, EndDate,
CanoeDiscipline (Slalom/Sprint/WildWater), TimeMode (Points100 = hundredths)
```

#### Participants (→ Participant entity)
```
Id (composed: ICFId.ClassId), ClassId, EventBib, ICFId, FamilyName, GivenName,
NOC, Club, CatId (age category), IsTeam, Member1-3 (team refs)
```

#### Classes (→ Class entity)
```
ClassId (e.g., K1M-ZS), Class, LongTitle,
Categories: CatId, Category, FirstYear, LastYear
```

#### Schedule (→ Race entity)
```
RaceId (ClassId_DisId_Day), RaceOrder, StartTime, ClassId, DisId,
FirstBib, StartInterval, CourseNr, RaceStatus (1-12 enum)
```

#### Results (→ Result entity)
```
RaceId, Id (participant), StartOrder, Bib, StartTime, Status,
dtStart, dtFinish, Time (hundredths), Gates (penalty string), Pen,
Total, Rnk, CatRnk, TotalTotal (best of both), BetterRunNr
```

---

## 2. Key Design Decisions

### Decision 1: Time Storage Format
**Decision**: Store times as INTEGER (hundredths of seconds)
**Rationale**: Matches XML format exactly, no precision loss, easy arithmetic
**Alternatives**: REAL (floating point) - rejected due to precision issues

### Decision 2: Gate Penalties Storage
**Decision**: Store as JSON array (SQLite JSON1 extension)
**Rationale**: Variable gate count (6-25), preserves position semantics, queryable via JSON functions
**Alternatives**:
- Fixed 25 columns - rejected, inflexible
- Comma-separated string - rejected, harder to query

### Decision 3: OnCourse Data
**Decision**: In-memory Map, not persisted to SQLite
**Rationale**: Transient by nature (~4s lifetime), TCP stream restores state, simplifies DB
**Alternatives**: Separate SQLite table - rejected per clarification session

### Decision 4: Multi-Run Handling (BR1/BR2)
**Decision**: Store each run as separate Result row, link via RaceId pattern
**Rationale**: BR1 and BR2 have different RaceId (K1M-ZS_BR1_25 vs K1M-ZS_BR2_25), natural separation
**Alternatives**: Single row with run1/run2 columns - rejected, doesn't scale to other formats

### Decision 5: Category Hierarchy
**Decision**: Class contains nested Categories, stored as separate table with FK
**Rationale**: One Class (K1M-ZS) can have multiple age Categories with year ranges
**Alternatives**: Denormalize into Class - rejected, loses filtering capability

### Decision 6: Cross Discipline Support
**Decision**: Basic support via DisId and existing columns, defer heat bracket logic
**Rationale**: DisId already captures XT/X4/XS/XF, time semantics differ but structure same
**Alternatives**: Separate Cross tables - rejected as over-engineering for MVP

---

## 3. Data Relationships

```
Event 1──* Race (via eventId FK)
Event 1──* Class (via eventId FK)
Event 1──* Participant (via eventId FK)
Event 1──* Course (via eventId FK)

Class 1──* Category (via classId FK)
Class 1──* Race (via classId FK)
Class 1──* Participant (via classId FK)

Race *──* Participant via Result (junction)
Result belongs to Race + Participant

Participant.member1-3 → Participant.id (self-reference for teams)
```

---

## 4. Status Codes Reference

### RaceStatus (1-12)
| Value | Name | Display |
|-------|------|---------|
| 1 | Scheduled | Planned |
| 3 | StartListOK | Startlist Ready |
| 4 | ComingUp | Coming Up |
| 8 | InProgress | Live |
| 10 | Completed | Unofficial |
| 11 | Final | Official |

### Result Status
| Value | Meaning |
|-------|---------|
| (empty) | OK - completed |
| DNS | Did Not Start |
| DNF | Did Not Finish |
| DSQ | Disqualified |
| CAP | Capsized |

---

## 5. LivePage Prototype Mapping

Based on rvp-design-system LivePage prototype, required data fields:

### Results List View (Simple)
- Rank, Bib, Name, Club, Time, Penalty, Total, Behind

### Results List View (Detailed)
- + Gate penalties breakdown, Start time, Finish time

### OnCourse View
- Bib, Name, Club, Current gate, Running time, Accumulated penalties

### Event Header
- Event title, Location, Date, Current race name

All fields are available in the XML format and mapped to entities above.

---

## 6. Unresolved Items

None - all clarifications resolved in spec phase.

---

## 7. References

- [c123-xml-format.md](../../../c123-protocol-docs/c123-xml-format.md)
- [c123-protocol.md](../../../c123-protocol-docs/c123-protocol.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)

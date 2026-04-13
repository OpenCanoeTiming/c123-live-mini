# Run Detail Display Optimization — Design Spec

**Issue:** #143 — Optimize display of run detail in live results  
**Date:** 2026-04-13

## Problem

The run detail expand panel has three inconsistent layouts depending on context:
1. **Single-run race** — shows START/FINISH timestamps, gate count, "Brankový průběh" label + gate badges
2. **BR race, both runs** — two columns with START/FINISH timestamps + gate badges per run, no gate count
3. **BR race, one run** — START/FINISH timestamps, gate count, no gate badges sometimes

Absolute timestamps (e.g. 23:07:50.321) are meaningless to spectators. Gate count is redundant (visible from badge count). The "R" suffix on reverse gate badges is bulky.

## Design

### Unified Run Detail Layout

Every run detail block follows the same structure:

```
[Čas: 87.09  |  Pen: 4  |  Celkem: 91.09]
[1  2  3↑  4  5  6↑  7  8  9  ...]
```

**Removed:**
- Absolute timestamps (START / CÍL)
- Gate count (BRANEK)
- "Brankový průběh" label
- `formatTimestamp()` helper (unused after this change)

**Added:**
- Time breakdown: Čas (run time without penalties), Pen (total penalty seconds), Celkem (total time)
- These values already exist in the result row data (`time`, `pen`, `total`)

### Race Type Variants

**Single-run race:** One block with time breakdown + gate badges.

**BR race — always two blocks** (side by side on desktop, stacked on mobile):
- Both runs exist → both blocks filled, better run highlighted (existing blue styling)
- One run exists → filled block for completed run + gray placeholder block for missing run
- Each block labeled "1. jízda" / "2. jízda"
- Missing run placeholder shows dash values (Čas: – | Pen: – | Celkem: –)

**Identifying which run exists in BR single-run case:**
- `betterRunNr` indicates which run is the better/only run
- If `prevGates` is null, only the primary run exists
- Run number assignment uses existing logic (betterRunNr maps better data to correct slot)

### Reverse Gate Styling

Current: Badge shows `5R` with text suffix.

New: Badge shows *5*<sup>↑</sup> — gate number in italic + tiny superscript arrow.

- Gate number rendered in italic (`font-style: italic`)
- Superscript ↑ arrow after the number (`font-size: ~0.65em; vertical-align: super`)
- Badge color continues to encode penalty status (green=0, yellow=2, red=50, gray=not passed)
- Reverse distinction is purely typographic — no color conflict with penalty encoding

Implementation in `GatePenalties.tsx`:
- `getGateLabel()` returns just the number (no "R")
- Render reverse indicator as a separate `<span>` with superscript styling
- Badge content becomes JSX instead of plain string

## Files to Change

| File | Change |
|------|--------|
| `packages/client/src/components/RunDetailExpand.tsx` | Replace timestamps with time breakdown, always show two blocks for BR, add placeholder for missing run |
| `packages/client/src/components/RunDetailExpand.module.css` | New styles for time breakdown row, placeholder block |
| `packages/client/src/components/GatePenalties.tsx` | Italic number + superscript ↑ for reverse gates |
| `packages/client/src/components/GatePenalties.module.css` | Styles for italic gate number and superscript arrow |
| `packages/client/src/hooks/useEventLiveState.ts` | Extend `RunDetailData` with time/pen/total (+ prev variants for BR) |
| `packages/client/src/pages/EventDetailPage.tsx` | Propagate time/pen/total into RunDetailData when caching details |

## Data Flow

Time/pen/total are already available in `PublicResult` (base type). When fetching detailed results, these fields come alongside gate data. They need to be:
1. Added to `RunDetailData` interface
2. Populated when caching detailed results in EventDetailPage
3. Consumed by RunDetailExpand for display

For BR races, `prevTime`/`prevPen`/`prevTotal` from `PublicResultMultiRun` provide the other run's values.

## Out of Scope

- Changes to the main result table columns
- Server-side API changes (all data already available)
- Changes to scoreboard or on-course display (separate apps)

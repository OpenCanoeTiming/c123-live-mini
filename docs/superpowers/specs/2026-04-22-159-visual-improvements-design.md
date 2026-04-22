# Priority Visual Improvements of Live Results — Design Spec

**Issue:** #159 — Priority visual improvements of live results
**Date:** 2026-04-22

## Problem

The mobile live-results view accumulates small UX frictions:

- Bib badge inside the name cell eats horizontal space on narrow screens
- BR stacked run cell labels each line with `1.` / `2.` even though position already conveys the run number
- Run times in the stacked mobile cell are left-aligned, so decimals don't line up between `125.85 (54)` and `75.00 (4)`
- The expand detail panel shows the athlete name as its header — duplicates the row directly above
- The detail panel doesn't show the rank within the age category (e.g. "3rd in DM"), which is what a spectator actually wants to know
- The detail panel wastes vertical space: wide gaps between Čas / Pen / Celkem, wide left padding, large grid gap between the two BR run blocks
- The page wrapper has more horizontal margin than the mobile viewport can afford
- BR desktop columns `1. jízda` / `2. jízda` show time only — penalties are hidden until the row is expanded

The star button is mentioned in the issue but the user explicitly decided to leave it as-is — out of scope for this change.

## Design

### Results row — mobile

Before (per issue screenshot, row 12):
```
 12   ☆ [38] POKORNÝ Daniel DS           1. 125.85 (54)
      Univerzitní sportovní klub Praha   2.  75.00 (4)
```

After:
```
 12   ☆ POKORNÝ Daniel DS               125.85 (54)
      Univerzitní sportovní klub Praha   75.00 (4)
```

Changes:
- Remove `[bib]` badge from `NameCell`. Name cell becomes `☆ Name CAT` / `Club`.
- In `BrRunsCell`, drop the `1.` / `2.` label span. Position conveys run number (first line = run 1, second = run 2). Better-run styling (bold + primary color) still marks which run was faster.
- **Edge case — only one run has data:** still render both slot lines so position remains meaningful. The missing run renders as a muted em-dash placeholder (`—`). This keeps layout predictable and preserves the "top = run 1" convention.
- Times in the stacked cell use a new `TimeValue` split-span: integer part right-aligned in a 3ch-wide inline-block, decimal part left-aligned. The decimal point aligns across stacked rows regardless of integer width.
- Penalty `(N)` stays to the right of the time with a small gap — we don't attempt to align the penalty.

### Results row — desktop BR

Desktop BR columns today show the time only:
```
1. jízda    2. jízda
  85.20       87.15
```

After:
```
1. jízda      2. jízda
 85.20 (2)    87.15 (4)
```

- `buildBestRunColumns` `run1` / `run2` renderers append `(N)` when `run.pen > 0`, using the same style as mobile (`.brRunPen` → monospace, warning color).
- Standard (non-BR) desktop table is unchanged.

### Detail header

Before: the detail panel starts with a bold repeat of the athlete name.

After: the detail panel starts with a compact meta line:
```
St.č. [25], 3. DM
```

Rules:
- `bib` is always shown as a bib badge (same styling as the one we're removing from the row) prefixed with `St.č.`.
- `catId` present + `catRnk` present → append `, 3. DM`.
- `catId` present + `catRnk` missing → append `, DM` (no rank).
- `catId` missing → just `St.č. [25]` (no orphan rank without a category label).

### Detail spacing

- `container` padding: `0.75rem 0.75rem 0.75rem 2rem` → `0.5rem 0.5rem 0.5rem 1rem` on mobile, `0.75rem 0.75rem 0.75rem 1.5rem` on desktop. Border-left accent bar stays.
- `timeBreakdown` horizontal gap: `1rem` → `0.5rem`.
- `timeBreakdown` bottom margin: `0.5rem` → `0.25rem`.
- `runsGrid` gap (BR two-column): `0.75rem` → `0.5rem`.
- `1. jízda` / `2. jízda` labels inside run sections stay — at side-by-side zoom level the label is useful for orientation (user explicitly asked to keep them).

### Page margins

- `EventDetailPage.module.css` `.pageWrapper` `padding: 0 1rem` → `padding: 0 0.5rem` on mobile (`max-width: 640px`), keep `0 1rem` on desktop.
- `EventHeader.module.css` `.wrapper` gets `margin: 0 -0.5rem` on mobile (`max-width: 640px`) and `margin: 0 -1rem` on desktop — this negative margin cancels the `.pageWrapper` horizontal padding so the hero bleeds edge-to-edge while tables keep their tiny outer margin. The wrapper already exists (hosts the rounded-avatar overrides); only the margin rule is new.

## Files to Change

| File | Change |
|------|--------|
| `packages/client/src/components/ResultList.tsx` | Remove `bibBadge` from `NameCell`. Drop `brRunLabel` from `BrRunsCell`. Render missing-run placeholder line. Add `TimeValue` helper. Extend `buildBestRunColumns` `run1`/`run2` renderers with penalty. |
| `packages/client/src/components/ResultList.module.css` | Remove `.bibBadge`, `.brRunLabel`. Add `.timeValue`, `.timeInt`, `.timeFrac`, `.timeDash` for the split-span alignment. `.brRunsStacked` stays flex-column / flex-start — decimal alignment comes from the split-span, not container alignment. |
| `packages/client/src/components/RunDetailExpand.tsx` | Replace `athleteName` prop with `bib` / `catRnk` / `catId` props. Render `DetailHeader` with `St.č. [bib], <rnk>. <cat>`. |
| `packages/client/src/components/RunDetailExpand.module.css` | Tighten container padding (responsive), reduce `timeBreakdown` gap, reduce `runsGrid` gap. Add `.detailHeaderBib` badge style (port from `ResultList.module.css`). |
| `packages/client/src/pages/EventDetailPage.tsx` | Pass `bib` / `catRnk` / `catId` into `<RunDetailExpand>` instead of `athleteName`. `catRnk` and `catId` come from the `ResultEntry` row; for BR combined rows `catRnk` already exists in `PublicResult`. |
| `packages/client/src/pages/EventDetailPage.module.css` | Responsive `.pageWrapper` padding. |
| `packages/client/src/components/EventHeader.module.css` | Confirm hero goes edge-to-edge on mobile; remove any inherited horizontal padding if present. |
| `packages/client/src/components/ResultList.test.tsx` | Adjust assertions: no `[bib]` in row output; no `1.` / `2.` label text in BR stacked cell. |
| `packages/client/src/components/ResultList.br-status.test.tsx` | Same — update assertions for the new stacked layout. |

No server-side changes. `catRnk` and `catId` are already part of the public `Result` type.

## TimeValue component

Placed in `ResultList.tsx` (component-local helper, not exported).

```tsx
function TimeValue({ centis }: { centis: number | null }) {
  if (centis == null) return <span className={styles.timeDash}>—</span>;
  const formatted = (centis / 100).toFixed(2);
  const [intPart, fracPart] = formatted.split('.');
  return (
    <span className={styles.timeValue}>
      <span className={styles.timeInt}>{intPart}</span>
      <span className={styles.timeFrac}>.{fracPart}</span>
    </span>
  );
}
```

CSS:
```css
.timeValue { font-family: var(--csk-font-mono, monospace); font-variant-numeric: tabular-nums; }
.timeInt { display: inline-block; min-width: 3ch; text-align: right; }
.timeFrac { display: inline-block; text-align: left; }
.timeDash { color: var(--csk-color-text-tertiary, #9ca3af); }
```

3ch covers all realistic canoe-slalom times (including 3-digit totals like `125.85`). If a 4-digit integer ever appears the layout degrades gracefully — the intPart span grows beyond `min-width`, the decimal still aligns with other rows whose intPart fits.

## Out of scope

- Star button sizing (user opted out)
- OnCoursePanel, StartlistTable, ScheduleView layout (issue is about results only)
- Desktop standard (non-BR) column structure

## Implementation phases

1. **Row compact** — bib out of row, `1.`/`2.` labels out, `TimeValue` split-span, missing-run placeholder
2. **Detail header** — bib + catRnk + catId header, remove `athleteName` prop
3. **Desktop BR penalty** — append `(N)` to `run1` / `run2` column renderers
4. **Spacing** — detail padding/gaps, page wrapper padding
5. **Tests** — update `ResultList.test.tsx` and `ResultList.br-status.test.tsx` assertions

Each phase is a separate commit with a conventional prefix (`feat(client):`) so Release Please picks it up. Branch `feat/159-results-visual-polish` off `main`. Push to `staging` for visual iteration before PR.

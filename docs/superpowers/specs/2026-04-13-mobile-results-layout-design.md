# Mobile Results Layout Improvement

**Issue:** [#140 — Improve mobile results layout](https://github.com/OpenCanoeTiming/c123-live-mini/issues/140)
**Date:** 2026-04-13

---

## Problem

On mobile (<=640px), the results table name cell has two layout issues:

1. **Misaligned club text** — The bib badge indents the athlete name, but the club line below starts at the cell's left edge, creating a ragged left alignment.
2. **Row height inconsistency** — Long athlete names or club names wrap to multiple lines, causing rows to grow vertically and breaking the visual rhythm of the table.

## Design

Restructure the name cell from:

```
[bib] Name ☆ [cat]
Club name
```

To:

```
[bib] ☆ Name
         [cat] Club name
```

### Changes

**1. Name cell layout (both `buildStandardColumns` and `buildBestRunColumns` in `ResultList.tsx`)**

Restructure the name cell render function:

- **Line 1:** `[bib]` badge + `☆` star button + athlete name — in a single flex row
- **Line 2:** `[cat]` tag + club name — indented to align with the name start (i.e. left-padded past the bib+star block)
- Bib and star form a fixed-width left block; name flows after them
- Both lines use `text-overflow: ellipsis` with `overflow: hidden` and `white-space: nowrap` to prevent wrapping

**2. CSS changes (`ResultList.module.css`)**

- `.athleteName` — flex row, `overflow: hidden`, `white-space: nowrap`, `text-overflow: ellipsis` on the name text span
- `.athleteClub` — same ellipsis treatment, left margin matching the bib+star width so it aligns under the name
- `.bibBadge` + `.starButton` — `flex-shrink: 0` to never compress
- The name text itself (not the flex container) needs the ellipsis — wrap it in a span with `overflow: hidden; text-overflow: ellipsis; min-width: 0`

**3. Star button positioning**

Move `<StarButton>` from after the name to between bib and name. The star is always present for all athletes (it toggles favorite on/off), so it occupies a fixed slot. No conditional empty space needed.

### What's NOT changing

- Desktop layout stays the same (changes scoped to mobile via existing responsive classes or always applied if they look fine on desktop too)
- Column structure (rank, name, result/runs, etc.) unchanged
- No new design system components needed
- Expand/collapse behavior unchanged
- No changes to data flow or API

### Scope check

This is a CSS + JSX restructuring of the name cell render function in one component (`ResultList.tsx`) and its CSS module. Both `buildStandardColumns` and `buildBestRunColumns` have identical name cell render functions that need the same change.

## Verification

- Screenshot iPhone 13 Mini (375px width) viewport of staging results via Playwright
- Verify: club text aligns under name, no line wrapping, ellipsis on long names/clubs
- Check both standard race and best-run (BR) race layouts
- Check rows with and without category tags
- Check desktop layout is not regressed (769px+ viewport)

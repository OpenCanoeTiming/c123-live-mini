# #159 Priority Visual Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the live results view per issue #159 — compact mobile row (no bib, no run labels), decimal alignment via split-span, detail header with bib + cat rank + cat id, desktop BR penalty in run columns, tighter spacing.

**Architecture:** Frontend-only, React + TS + CSS Modules. No server changes. Data (`catRnk`, `catId`, `pen`) already surfaced by the API. A new `TimeValue` helper in `ResultList.tsx` provides integer/fraction split-spans for mobile BR decimal alignment; desktop table columns keep the existing `formatTime()` + `tabular-nums` approach so existing text-based tests don't churn. The detail header is refactored from `athleteName` to `bib` + `catRnk` + `catId` props.

**Tech Stack:** React 18, TypeScript strict, Vite, Vitest + Testing Library (jsdom), CSS Modules, `@czechcanoe/rvp-design-system`.

Spec: [`docs/superpowers/specs/2026-04-22-159-visual-improvements-design.md`](../specs/2026-04-22-159-visual-improvements-design.md)

---

## File Map

| File | Role in this plan |
|---|---|
| `packages/client/src/components/ResultList.tsx` | `NameCell` loses bib badge. `BrRunsCell` loses `1./2.` labels, uses new `TimeValue`, always renders both slots. `buildBestRunColumns` run1/run2 renderers append `(N)` penalty. New internal `TimeValue` helper. |
| `packages/client/src/components/ResultList.module.css` | Drop `.bibBadge`, `.brRunLabel` rules. Add `.timeValue`, `.timeInt`, `.timeFrac`, `.timeDash`, `.brRunLineDim` (muted placeholder). Adjust `.athleteClub` left indent (no more bib in flow). |
| `packages/client/src/components/ResultList.test.tsx` | Unchanged (doesn't assert bib/label text). Verify. |
| `packages/client/src/components/ResultList.br-status.test.tsx` | New test asserting mobile BR stacked cell has no `1./2.` label and no `[bib]` badge. |
| `packages/client/src/components/RunDetailExpand.tsx` | Replace `athleteName` prop with `bib`, `catRnk`, `catId`. New `DetailHeader` internal component. |
| `packages/client/src/components/RunDetailExpand.module.css` | Tighten `.container` padding (responsive), reduce `.timeBreakdown` gap, reduce `.runsGrid` gap. Add `.detailHeader` container, `.detailHeaderBib` badge style (copy of old `.bibBadge` from ResultList). |
| `packages/client/src/components/RunDetailExpand.test.tsx` | **NEW FILE** — unit tests for the three `DetailHeader` variants (bib only, bib + cat, bib + cat + rank). |
| `packages/client/src/pages/EventDetailPage.tsx` | Update `<RunDetailExpand>` call site: drop `athleteName`, pass `bib` / `catRnk` / `catId` from the `row`. |
| `packages/client/src/pages/EventDetailPage.module.css` | `.pageWrapper` mobile padding `1rem` → `0.5rem`. |
| `packages/client/src/components/EventHeader.module.css` | Add `.wrapper` negative margin to cancel page wrapper padding (edge-to-edge hero). |

---

## Task 1: TimeValue split-span helper

**Files:**
- Modify: `packages/client/src/components/ResultList.tsx`
- Modify: `packages/client/src/components/ResultList.module.css`

- [ ] **Step 1: Add CSS rules for split-span**

Append to `packages/client/src/components/ResultList.module.css`:

```css
/* Split-span time value for mobile BR stacked cell — aligns on decimal
 * across rows regardless of integer width (85.20 / 100.50). */
.timeValue {
  font-family: var(--csk-font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.timeInt {
  display: inline-block;
  min-width: 3ch;
  text-align: right;
}

.timeFrac {
  display: inline-block;
  text-align: left;
}

.timeDash {
  color: var(--csk-color-text-tertiary, #9ca3af);
  font-family: var(--csk-font-mono, 'JetBrains Mono', 'Fira Code', monospace);
}
```

- [ ] **Step 2: Add TimeValue helper in ResultList.tsx**

Add near the top of `ResultList.tsx`, after the `NameCell` definition (around line 62):

```tsx
/** Split-span time value for decimal-point alignment in stacked mobile cells.
 *  The integer part right-aligns in a fixed 3ch box, the fraction part left-aligns;
 *  the decimal point therefore sits at a consistent offset across stacked rows. */
function TimeValue({ centis }: { centis: number | null }) {
  if (centis == null) {
    return <span className={styles.timeDash}>—</span>;
  }
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

- [ ] **Step 3: Verify typecheck**

Run from project root:
```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors (the helper is unused at this point but declared and typed correctly).

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/components/ResultList.tsx packages/client/src/components/ResultList.module.css
git commit -m "feat(client): add TimeValue split-span helper for decimal alignment"
```

---

## Task 2: Drop bib badge from NameCell

**Files:**
- Modify: `packages/client/src/components/ResultList.tsx` (`NameCell`)
- Modify: `packages/client/src/components/ResultList.module.css` (drop `.bibBadge`, adjust `.athleteClub`)

- [ ] **Step 1: Remove bib badge from NameCell JSX**

In `ResultList.tsx`, replace the `NameCell` body (around lines 40-61):

```tsx
function NameCell({
  row,
  favorites,
}: {
  row: ResultEntry;
  favorites?: {
    isFavorite: (bib: number, classId: string) => boolean;
    onToggle: (bib: number, classId: string) => void;
    classId: string | null;
  };
}) {
  return (
    <div className={styles.nameCell}>
      <div className={styles.athleteName}>
        {favorites && row.bib != null && favorites.classId && (
          <StarButton
            active={favorites.isFavorite(row.bib, favorites.classId)}
            onClick={() => favorites.onToggle(row.bib!, favorites.classId!)}
          />
        )}
        <span className={styles.athleteNameText}>{row.name}</span>
        {row.catId && <span className={styles.catTag}>{row.catId}</span>}
      </div>
      {row.club && (
        <div className={styles.athleteClub}>
          <span className={styles.athleteClubText}>{row.club}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Remove `.bibBadge` rule and adjust `.athleteClub` indent**

In `ResultList.module.css`, delete the `.bibBadge` block (lines ~326-341).

Update the desktop indent for `.athleteClub` (around lines 283-288) — there's no bib in the flow anymore, the indent now only accounts for the star:

```css
/* On desktop, indent club under the name (past star + gap) */
@media (min-width: 641px) {
  .athleteClub {
    /* star(20px) + gap(0.25rem) */
    margin-left: calc(20px + 0.25rem);
  }
}
```

- [ ] **Step 3: Run client tests**

From project root:
```bash
npm --workspace @c123-live-mini/client test -- --run
```
Expected: PASS. (Existing tests don't assert on bib badge text.)

- [ ] **Step 4: Typecheck**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/components/ResultList.tsx packages/client/src/components/ResultList.module.css
git commit -m "feat(client): drop bib badge from results row name cell (#159)"
```

---

## Task 3: Mobile BR stacked cell — remove labels, use TimeValue, always render both slots

**Files:**
- Modify: `packages/client/src/components/ResultList.tsx` (`BrRunsCell`)
- Modify: `packages/client/src/components/ResultList.module.css` (drop `.brRunLabel`, add `.brRunLineDim`)
- Modify: `packages/client/src/components/ResultList.br-status.test.tsx` (add regression test)

- [ ] **Step 1: Write failing regression test for no `1./2.` labels and no bib in mobile BR cell**

Append to `packages/client/src/components/ResultList.br-status.test.tsx`:

```tsx
describe('ResultList — BR mobile stacked cell (#159)', () => {
  afterEach(() => cleanup());

  it('does not render "1." / "2." labels in the mobile stacked cell', () => {
    const { container } = render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: 1,
            total: 9000,
            totalTotal: 9000,
            betterRunNr: 2,
            prevTotal: 8500,
            prevStatus: null,
            currStatus: null,
            status: null,
          }),
        ])}
      />
    );

    // The mobile stacked cell (column key "brRuns") must not contain the text
    // "1." or "2." preceding the run times — run identification is by position.
    const mobileCell = container.querySelector('[class*="brRunsStacked"]');
    expect(mobileCell).not.toBeNull();
    expect(mobileCell!.textContent).not.toMatch(/^\s*1\./);
    expect(mobileCell!.textContent).not.toMatch(/2\./);
  });

  it('renders a dash placeholder for the missing run slot', () => {
    const { container } = render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: 1,
            total: 8500,
            totalTotal: 8500,
            betterRunNr: 1,
            prevTotal: null,    // only run 1 has data
            prevStatus: null,
            currStatus: null,
            status: null,
          }),
        ])}
      />
    );

    const mobileCell = container.querySelector('[class*="brRunsStacked"]');
    expect(mobileCell).not.toBeNull();
    // Missing run 2 slot renders as em-dash; confirm exactly one dash appears
    // in the stacked cell's text content (run 1 has a real time).
    expect(mobileCell!.textContent).toContain('—');
  });
});
```

- [ ] **Step 2: Run the new tests — should fail**

```bash
npm --workspace @c123-live-mini/client test -- --run ResultList.br-status.test
```
Expected: FAIL — the label `1.` is still present and the missing slot isn't rendered.

- [ ] **Step 3: Rewrite BrRunsCell**

In `ResultList.tsx`, replace the entire `BrRunsCell` (lines ~163-204) with:

```tsx
/** Mobile-only cell showing both BR runs stacked.
 *  Position = run number (no label). Missing slot renders as em-dash placeholder. */
function BrRunsCell({ row }: { row: ResultEntry }) {
  const { run1, run2 } = resolveBrRuns(row);
  const isBetter1 = row.betterRunNr === 1;
  const isBetter2 = row.betterRunNr === 2;

  const renderLine = (
    run: { total: number | null; pen: number | null; status: string | null },
    isBetter: boolean,
    key: string,
  ) => {
    const hasData = run.total != null || run.status != null;
    const dimClass = hasData ? '' : styles.brRunLineDim;
    return (
      <div key={key} className={`${styles.brRunLine} ${isBetter ? styles.betterRun : ''} ${dimClass}`}>
        {run.status ? (
          <StatusBadge status={run.status} />
        ) : (
          <>
            <TimeValue centis={run.total} />
            {run.pen != null && run.pen > 0 && (
              <span className={styles.brRunPen}>({formatPenalty(run.pen)})</span>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.brRunsStacked}>
      {renderLine(run1, isBetter1, 'run1')}
      {renderLine(run2, isBetter2, 'run2')}
    </div>
  );
}
```

- [ ] **Step 4: Update CSS — drop `.brRunLabel`, add `.brRunLineDim`**

In `ResultList.module.css`, delete the `.brRunLabel` block (around lines 366-370).

Append:

```css
/* Muted placeholder for a missing BR run slot (em-dash shows instead of a time). */
.brRunLineDim {
  opacity: 0.45;
}
```

- [ ] **Step 5: Run tests — should pass**

```bash
npm --workspace @c123-live-mini/client test -- --run
```
Expected: PASS — including the new regression tests from Step 1.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/components/ResultList.tsx packages/client/src/components/ResultList.module.css packages/client/src/components/ResultList.br-status.test.tsx
git commit -m "feat(client): compact mobile BR stacked cell with decimal alignment (#159)"
```

---

## Task 4: Desktop BR run columns show penalty

**Files:**
- Modify: `packages/client/src/components/ResultList.tsx` (`buildBestRunColumns`)

- [ ] **Step 1: Write failing test for desktop run1/run2 penalty display**

Append a new suite to `packages/client/src/components/ResultList.br-status.test.tsx`:

```tsx
describe('ResultList — BR desktop penalty in run columns (#159)', () => {
  afterEach(() => cleanup());

  it('renders penalty in parens next to the run1 time', () => {
    const { container } = render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: 1,
            total: 9000,
            totalTotal: 9000,
            betterRunNr: 2,
            prevTotal: 8500,
            prevPen: 200,        // 2s penalty on run 1
            prevStatus: null,
            currStatus: null,
            status: null,
          }),
        ])}
      />
    );

    // The run1 desktop column cell should contain the time "85.00" and "(2)"
    // penalty marker. We search for "(2)" globally; mobile stacked cell also
    // shows it, but at least one desktop hideOnMobile cell must carry it.
    expect(container.textContent).toContain('85.00');
    expect(container.textContent).toContain('(2)');
  });

  it('does not render penalty parens when pen is 0', () => {
    const { container } = render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: 1,
            total: 9000,
            totalTotal: 9000,
            betterRunNr: 2,
            prevTotal: 8500,
            prevPen: 0,          // clean
            prevStatus: null,
            currStatus: null,
            status: null,
          }),
        ])}
      />
    );
    expect(container.textContent).not.toContain('(0)');
  });
});
```

- [ ] **Step 2: Run the new tests — should fail**

```bash
npm --workspace @c123-live-mini/client test -- --run ResultList.br-status.test
```
Expected: FAIL — the run1/run2 columns do not yet render penalty.

- [ ] **Step 3: Update buildBestRunColumns run1 and run2 renderers**

In `ResultList.tsx`, replace the `run1` column render (around lines 236-252) and `run2` column render (around lines 253-269) with versions that append penalty:

```tsx
    {
      key: 'run1',
      header: '1. jízda',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        const { run1 } = resolveBrRuns(row);
        if (run1.status) return <StatusBadge status={run1.status} />;
        if (run1.total == null) return <span className={styles.monoText}>-</span>;
        const isBetter = row.betterRunNr === 1;
        return (
          <span className={isBetter ? styles.betterRun : ''}>
            <span className={styles.monoText}>{formatTime(run1.total)}</span>
            {run1.pen != null && run1.pen > 0 && (
              <span className={styles.brRunPen}> ({formatPenalty(run1.pen)})</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'run2',
      header: '2. jízda',
      align: 'right',
      hideOnMobile: true,
      render: (row) => {
        const { run2 } = resolveBrRuns(row);
        if (run2.status) return <StatusBadge status={run2.status} />;
        if (run2.total == null) return <span className={styles.monoText}>-</span>;
        const isBetter = row.betterRunNr === 2;
        return (
          <span className={isBetter ? styles.betterRun : ''}>
            <span className={styles.monoText}>{formatTime(run2.total)}</span>
            {run2.pen != null && run2.pen > 0 && (
              <span className={styles.brRunPen}> ({formatPenalty(run2.pen)})</span>
            )}
          </span>
        );
      },
    },
```

Note: the space before `(` (i.e. `" ("`) creates the separator between time and penalty. `.brRunPen` already styles the penalty warning-orange and monospace.

- [ ] **Step 4: Run tests — should pass**

```bash
npm --workspace @c123-live-mini/client test -- --run
```
Expected: PASS.

- [ ] **Step 5: Typecheck**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/components/ResultList.tsx packages/client/src/components/ResultList.br-status.test.tsx
git commit -m "feat(client): show penalty in BR run columns on desktop (#159)"
```

---

## Task 5: RunDetailExpand header — bib + catRnk + catId

**Files:**
- Modify: `packages/client/src/components/RunDetailExpand.tsx`
- Modify: `packages/client/src/components/RunDetailExpand.module.css`
- Create: `packages/client/src/components/RunDetailExpand.test.tsx`
- Modify: `packages/client/src/pages/EventDetailPage.tsx` (call site)

- [ ] **Step 1: Add CSS for new detail header and bib badge**

In `RunDetailExpand.module.css`, replace the `.detailHeader` block (around lines 12-17) with:

```css
.detailHeader {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--csk-font-size-sm, 0.875rem);
  color: var(--csk-color-text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.detailHeaderLabel {
  color: var(--csk-color-text-tertiary, #9ca3af);
  font-size: var(--csk-font-size-xs, 0.75rem);
}

.detailHeaderBib {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.0625rem 0.3rem;
  border-radius: 3px;
  background: var(--csk-color-bg-primary, #fff);
  border: 1px solid var(--csk-color-border-secondary, #e5e7eb);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--csk-color-text-secondary, #6b7280);
  line-height: 1.4;
}

.detailHeaderMeta {
  font-weight: 500;
  color: var(--csk-color-text-primary, #111827);
}
```

- [ ] **Step 2: Update RunDetailExpand props and add DetailHeader**

In `RunDetailExpand.tsx`, replace the interface and header rendering. Full replacement of the props interface and the two `return` branches that include `athleteName`:

Replace the `RunDetailExpandProps` interface (around lines 15-26):

```tsx
interface RunDetailExpandProps {
  detail: RunDetailData | null;
  isLoading: boolean;
  isBestRun?: boolean;
  /** Bib of the athlete for the detail header. */
  bib?: number | null;
  /** Age category rank — shown as "N." prefix when both catRnk and catId exist. */
  catRnk?: number | null;
  /** Age category id (e.g. "DM") — required for catRnk to render. */
  catId?: string | null;
  betterRunNr?: number | null;
  // Per-run status (#162): when set, render DNS/DNF/DSQ in place of
  // time/total. Distinguishes "run attempted but didn't finish" from
  // "run hasn't happened yet" (both-null → dashed placeholder).
  prevStatus?: string | null;
  currStatus?: string | null;
}
```

Add a new `DetailHeader` component below `RunPlaceholder` (before the main `RunDetailExpand`):

```tsx
/** Compact header for the detail panel: "St.č. [25], 3. DM".
 *  - catRnk without catId is suppressed (no orphan "3." without a category).
 *  - catId without catRnk renders as "St.č. [25], DM".
 *  - bib missing falls back to "-".
 */
function DetailHeader({ bib, catRnk, catId }: {
  bib?: number | null;
  catRnk?: number | null;
  catId?: string | null;
}) {
  const showCat = Boolean(catId);
  const showRank = showCat && catRnk != null;
  return (
    <div className={styles.detailHeader}>
      <span className={styles.detailHeaderLabel}>St.č.</span>
      <span className={styles.detailHeaderBib}>{bib ?? '-'}</span>
      {showCat && (
        <span className={styles.detailHeaderMeta}>
          {showRank ? `, ${catRnk}. ${catId}` : `, ${catId}`}
        </span>
      )}
    </div>
  );
}
```

Replace the main component signature and the two header renders. Find the BR branch (around lines 143-159) and the single-run branch (around lines 162-173). Replace both `{athleteName && <div className={styles.detailHeader}>{athleteName}</div>}` lines with `<DetailHeader bib={bib} catRnk={catRnk} catId={catId} />`.

Replace the component signature:

```tsx
export function RunDetailExpand({ detail, isLoading, isBestRun, bib, catRnk, catId, betterRunNr, prevStatus, currStatus }: RunDetailExpandProps) {
```

- [ ] **Step 3: Update EventDetailPage call site**

In `packages/client/src/pages/EventDetailPage.tsx`, find the `<RunDetailExpand>` usage in `ResultList` (it's inside `ResultList.tsx`, not `EventDetailPage.tsx` — verify with grep):

```bash
grep -n "RunDetailExpand" packages/client/src/pages/EventDetailPage.tsx packages/client/src/components/ResultList.tsx
```

`RunDetailExpand` is used in `ResultList.tsx` around line 519. Update the call site (in `ResultList.tsx`) from:

```tsx
<RunDetailExpand
  detail={detail}
  isLoading={isLoading}
  isBestRun={isBestRun}
  athleteName={row.name}
  betterRunNr={row.betterRunNr}
  prevStatus={row.prevStatus}
  currStatus={row.currStatus}
/>
```

to:

```tsx
<RunDetailExpand
  detail={detail}
  isLoading={isLoading}
  isBestRun={isBestRun}
  bib={row.bib}
  catRnk={row.catRnk}
  catId={row.catId}
  betterRunNr={row.betterRunNr}
  prevStatus={row.prevStatus}
  currStatus={row.currStatus}
/>
```

- [ ] **Step 4: Create unit test file for DetailHeader**

Create `packages/client/src/components/RunDetailExpand.test.tsx`:

```tsx
/**
 * @vitest-environment jsdom
 *
 * Unit tests for the RunDetailExpand header (#159) — verifies the three
 * variants of the "St.č. [bib], N. CAT" header per the spec.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RunDetailExpand } from './RunDetailExpand';

const detail = {
  time: 8500,
  pen: 0,
  total: 8500,
  gates: null,
  prevTime: null,
  prevPen: null,
  prevTotal: null,
  prevGates: null,
};

describe('RunDetailExpand — header (#159)', () => {
  afterEach(() => cleanup());

  it('renders "St.č. [25], 3. DM" when bib, catRnk, and catId are all set', () => {
    render(<RunDetailExpand detail={detail} isLoading={false} bib={25} catRnk={3} catId="DM" />);
    expect(screen.getByText(/St\.\u010d\./)).toBeTruthy(); // "St.č."
    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getByText(/3\.\s*DM/)).toBeTruthy();
  });

  it('renders "St.č. [25], DM" when catId is set but catRnk is null', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={25} catRnk={null} catId="DM" />
    );
    expect(container.textContent).toContain('25');
    expect(container.textContent).toContain('DM');
    expect(container.textContent).not.toMatch(/\b\d+\.\s+DM/); // no "N. DM" rank prefix
  });

  it('renders just "St.č. [25]" when catId is missing, even if catRnk is set', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={25} catRnk={3} catId={null} />
    );
    expect(container.textContent).toContain('25');
    // Rank without category is suppressed — no standalone "3." that could mean anything
    expect(container.textContent).not.toMatch(/,\s*3\./);
  });

  it('falls back to "-" when bib is null', () => {
    const { container } = render(
      <RunDetailExpand detail={detail} isLoading={false} bib={null} catRnk={null} catId={null} />
    );
    // The bib badge should render a dash placeholder
    const header = container.querySelector('[class*="detailHeader"]');
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain('-');
  });
});
```

- [ ] **Step 5: Run all client tests**

```bash
npm --workspace @c123-live-mini/client test -- --run
```
Expected: PASS. The new `RunDetailExpand.test.tsx` covers all four header variants.

- [ ] **Step 6: Typecheck**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/components/RunDetailExpand.tsx packages/client/src/components/RunDetailExpand.module.css packages/client/src/components/RunDetailExpand.test.tsx packages/client/src/components/ResultList.tsx
git commit -m "feat(client): detail header shows bib + cat rank instead of name (#159)"
```

---

## Task 6: Detail panel spacing

**Files:**
- Modify: `packages/client/src/components/RunDetailExpand.module.css`

- [ ] **Step 1: Tighten container padding (responsive) and inner gaps**

In `RunDetailExpand.module.css`, replace the `.container` block (around lines 6-10):

```css
.container {
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  background-color: var(--csk-color-bg-secondary, #f9fafb);
  border-left: 3px solid var(--csk-color-primary, #2563eb);
}

@media (min-width: 641px) {
  .container {
    padding: 0.75rem 0.75rem 0.75rem 1.5rem;
  }
}
```

Replace the `.timeBreakdown` block (around lines 26-31):

```css
.timeBreakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
```

Replace the `.runsGrid` block (around lines 59-63):

```css
.runsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
```

The `@media (max-width: 640px)` rule for runsGrid (1-column) stays unchanged.

- [ ] **Step 2: Run tests (CSS regression-proof)**

```bash
npm --workspace @c123-live-mini/client test -- --run
```
Expected: PASS — CSS-only changes, logic unchanged.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/RunDetailExpand.module.css
git commit -m "feat(client): tighten RunDetailExpand spacing on mobile (#159)"
```

---

## Task 7: Page wrapper + hero edge-to-edge

**Files:**
- Modify: `packages/client/src/pages/EventDetailPage.module.css`
- Modify: `packages/client/src/components/EventHeader.module.css`

- [ ] **Step 1: Responsive page wrapper padding**

In `EventDetailPage.module.css`, replace `.pageWrapper`:

```css
.pageWrapper {
  padding: 0 0.5rem;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 641px) {
  .pageWrapper {
    padding: 0 1rem;
  }
}
```

- [ ] **Step 2: Hero negative margin to bleed edge-to-edge**

In `EventHeader.module.css`, add to the `.wrapper` (it currently only scopes the rounded-avatar overrides — add margin rules):

```css
.wrapper {
  margin: 0 -0.5rem;
}

@media (min-width: 641px) {
  .wrapper {
    margin: 0 -1rem;
  }
}
```

Place these rules above the existing `:global(...)` rules so they apply directly to the wrapper element.

- [ ] **Step 3: Run full test suite**

```bash
npm --workspace @c123-live-mini/client test -- --run
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/pages/EventDetailPage.module.css packages/client/src/components/EventHeader.module.css
git commit -m "feat(client): tighter page margins and edge-to-edge hero on mobile (#159)"
```

---

## Task 8: Visual verification on staging

**Files:** none (deployment step)

- [ ] **Step 1: Push feature branch**

```bash
git push -u origin feat/159-results-visual-polish
```

- [ ] **Step 2: Push to staging to deploy**

```bash
git push -f origin feat/159-results-visual-polish:staging
```

Railway auto-deploys `staging` → `https://<staging-url>`. Runbook: `docs/RUNBOOK.md`.

- [ ] **Step 3: Smoke-test on staging**

Open the staging URL on a phone (or mobile browser emulator):
- Verify results row has no `[bib]` badge on desktop or mobile
- Verify BR mobile stacked cell has no `1.` / `2.` labels
- Verify decimal alignment between rows of different integer width (e.g. `85.20` / `100.50`)
- Verify missing-run slot renders as dashed placeholder
- Verify desktop BR `1. jízda` / `2. jízda` show penalty `(N)` next to times
- Expand a result row → detail header should read `St.č. [bib], N. CAT` (or degraded variants)
- Verify hero section bleeds edge-to-edge on mobile; table has a small outer margin
- Verify detail panel spacing is tighter

Report any visual issues and iterate on the feature branch; repeat push-to-staging cycle as needed.

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "feat(client): priority visual improvements of live results (#159)" --body "$(cat <<'EOF'
## Summary

Visual polish pass on the live results view per #159. Frontend only, no server changes.

### Results row
- Remove bib badge from row name cell (moves to expanded detail)
- Drop `1.` / `2.` labels in mobile BR stacked cell — position conveys run number
- Split-span time rendering in mobile BR cell aligns decimals between rows of different integer widths (e.g. `125.85` / `75.00`)
- Always render both BR run slots, with em-dash placeholder for a missing run

### Detail panel
- Header replaced: `St.č. [bib], N. CAT` instead of duplicating the athlete name above
- Graceful fallbacks when catRnk or catId are missing
- Tighter padding and inner gaps to save vertical space on mobile

### Desktop BR
- `1. jízda` / `2. jízda` columns now show penalty in parens next to the time (`85.20 (2)`), matching the mobile formatting

### Page chrome
- Page wrapper padding reduced to `0.5rem` on mobile (was `1rem`)
- Hero section bleeds edge-to-edge via negative wrapper margin; tables keep their tiny outer margin

Star button size (mentioned in the issue) was intentionally left unchanged per user decision — the existing 44×44 tap area on coarse pointers is already mobile-safe.

## Test plan

- [x] Existing `ResultList.test.tsx` continues to pass
- [x] Existing `ResultList.br-status.test.tsx` continues to pass
- [x] New `ResultList.br-status.test.tsx` regression tests for no `1./2.` labels, dash placeholder, and desktop penalty in run columns
- [x] New `RunDetailExpand.test.tsx` covering the four header variants
- [x] Typecheck (`tsc --noEmit`) clean
- [ ] Manual verification on staging (mobile phone + desktop browser)

Closes #159

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Row compact (bib out, 1./2. out) → Tasks 2, 3
- ✅ Decimal alignment via split-span → Task 1 + applied in Task 3
- ✅ Missing-run dash placeholder → Task 3
- ✅ Desktop BR penalty → Task 4
- ✅ Detail header (bib + catRnk + catId) → Task 5
- ✅ Detail spacing → Task 6
- ✅ Page wrapper + hero margins → Task 7
- ✅ Star button untouched → (spec "Out of scope" section, no tasks)
- ✅ No server changes → (no server tasks)

**Placeholder scan:** no TBD / TODO / "implement later" / vague language detected.

**Type consistency:**
- `TimeValue` prop `centis: number | null` — consistent across Task 1 and Task 3
- `DetailHeader` props `bib` / `catRnk` / `catId` — consistent across Task 5 subparts
- `RunDetailExpandProps` renamed `athleteName` → `bib`/`catRnk`/`catId` — call site updated in same task

No gaps.

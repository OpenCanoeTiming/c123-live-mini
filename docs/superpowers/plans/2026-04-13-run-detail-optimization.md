# Run Detail Display Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the run detail expand panel across single-run and BR races, replace timestamps with time breakdown, and restyle reverse gates.

**Architecture:** Pure frontend change. Extend `RunDetailData` with time/pen/total fields, rewrite `RunDetailExpand` to use a unified layout, and update `GatePenalties` to render reverse gates with italic + superscript arrow.

**Tech Stack:** React 18, TypeScript, CSS Modules, @czechcanoe/rvp-design-system (Badge component)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/client/src/hooks/useEventLiveState.ts` | Modify | Add time/pen/total fields to `RunDetailData` |
| `packages/client/src/pages/EventDetailPage.tsx` | Modify | Populate new fields when caching detailed results |
| `packages/client/src/components/GatePenalties.tsx` | Modify | Italic + superscript ↑ for reverse gates |
| `packages/client/src/components/GatePenalties.module.css` | Modify | Styles for reverse gate rendering |
| `packages/client/src/components/RunDetailExpand.tsx` | Rewrite | Unified layout with time breakdown |
| `packages/client/src/components/RunDetailExpand.module.css` | Modify | New styles for time breakdown, placeholder block |

---

### Task 1: Extend RunDetailData with time/pen/total

**Files:**
- Modify: `packages/client/src/hooks/useEventLiveState.ts:39-48`
- Modify: `packages/client/src/pages/EventDetailPage.tsx:279-287` (viewMode fetch)
- Modify: `packages/client/src/pages/EventDetailPage.tsx:572-579` (expand fetch)

- [ ] **Step 1: Add time fields to RunDetailData interface**

In `packages/client/src/hooks/useEventLiveState.ts`, replace the `RunDetailData` interface (lines 39-48):

```typescript
export interface RunDetailData {
  time: number | null;
  pen: number | null;
  total: number | null;
  gates: PublicResultDetailed['gates'];
  // Previous run data (for BR races)
  prevTime?: number | null;
  prevPen?: number | null;
  prevTotal?: number | null;
  prevGates?: PublicResultDetailed['gates'];
}
```

Removed: `dtStart`, `dtFinish`, `courseGateCount`, `prevDtStart`, `prevDtFinish`.
Added: `time`, `pen`, `total`, `prevTime`, `prevPen`, `prevTotal`.

- [ ] **Step 2: Update viewMode detail cache population**

In `packages/client/src/pages/EventDetailPage.tsx`, update the CACHE_DETAILED dispatch around line 279:

```typescript
detail: {
  time: result.time ?? null,
  pen: result.pen ?? null,
  total: result.total ?? null,
  gates: result.gates ?? null,
  prevTime: result.prevTime ?? null,
  prevPen: result.prevPen ?? null,
  prevTotal: result.prevTotal ?? null,
  prevGates: result.prevGates ?? null,
},
```

- [ ] **Step 3: Update expand-row detail cache population**

In `packages/client/src/pages/EventDetailPage.tsx`, update the second CACHE_DETAILED dispatch around line 572 with the same shape:

```typescript
detail: {
  time: result.time ?? null,
  pen: result.pen ?? null,
  total: result.total ?? null,
  gates: result.gates ?? null,
  prevTime: result.prevTime ?? null,
  prevPen: result.prevPen ?? null,
  prevTotal: result.prevTotal ?? null,
  prevGates: result.prevGates ?? null,
},
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: May show errors in RunDetailExpand.tsx (it still references old fields) — that's expected, will be fixed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/hooks/useEventLiveState.ts packages/client/src/pages/EventDetailPage.tsx
git commit -m "refactor: extend RunDetailData with time/pen/total, remove timestamps (#143)"
```

---

### Task 2: Restyle reverse gates in GatePenalties

**Files:**
- Modify: `packages/client/src/components/GatePenalties.tsx`
- Modify: `packages/client/src/components/GatePenalties.module.css`

- [ ] **Step 1: Update GatePenalties to render reverse gates with italic + superscript arrow**

Replace `GatePenalties.tsx` content:

```tsx
/**
 * GatePenalties Component
 *
 * Displays gate-by-gate penalty visualization using compact badges.
 * Each gate shows: number and penalty status (clean/touch/miss).
 * Reverse gates are styled with italic number + superscript ↑ arrow.
 *
 * Visual coding:
 * - Green: 0 (clean gate)
 * - Yellow: 2 (touch penalty)
 * - Red: 50 (missed gate)
 * - Gray: null (not yet passed)
 */

import { Badge } from '@czechcanoe/rvp-design-system';
import type { PublicGate } from '@c123-live-mini/shared';
import styles from './GatePenalties.module.css';

interface GatePenaltiesProps {
  gates: PublicGate[];
}

function getPenaltyVariant(penalty: number | null): 'success' | 'warning' | 'error' | 'default' {
  if (penalty === null) return 'default';
  if (penalty === 0) return 'success';
  if (penalty === 2) return 'warning';
  return 'error';
}

function GateLabel({ gate }: { gate: PublicGate }) {
  const isReverse = gate.type === 'reverse';
  return (
    <span className={isReverse ? styles.reverseGate : undefined}>
      {gate.number}
      {isReverse && <span className={styles.reverseArrow}>↑</span>}
    </span>
  );
}

export function GatePenalties({ gates }: GatePenaltiesProps) {
  if (gates.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {gates.map((gate) => (
        <Badge
          key={gate.number}
          variant={getPenaltyVariant(gate.penalty)}
          size="sm"
          title={`Gate ${gate.number} (${gate.type}): ${gate.penalty === null ? 'Not passed' : gate.penalty === 0 ? 'Clean' : `+${gate.penalty}s`}`}
        >
          <GateLabel gate={gate} />
        </Badge>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for reverse gate styling**

Replace `GatePenalties.module.css`:

```css
/**
 * Layout styles for GatePenalties
 * Uses DS CSS variables for colors and spacing tokens
 */

.container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.reverseGate {
  font-style: italic;
}

.reverseArrow {
  font-size: 0.65em;
  vertical-align: super;
  line-height: 1;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: GatePenalties should compile clean. RunDetailExpand may still have errors (fixed in Task 3).

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/components/GatePenalties.tsx packages/client/src/components/GatePenalties.module.css
git commit -m "style: reverse gates with italic + superscript arrow instead of R suffix (#143)"
```

---

### Task 3: Rewrite RunDetailExpand with unified layout

**Files:**
- Rewrite: `packages/client/src/components/RunDetailExpand.tsx`
- Modify: `packages/client/src/components/RunDetailExpand.module.css`

- [ ] **Step 1: Rewrite RunDetailExpand component**

Replace `RunDetailExpand.tsx` with:

```tsx
/**
 * RunDetailExpand Component
 *
 * Displays inline detail for a run below the result row.
 * Shows time breakdown (time/pen/total) and gate-by-gate penalties.
 * For BR races, always shows both runs side by side — missing run as placeholder.
 */

import { SkeletonText } from '@czechcanoe/rvp-design-system';
import type { RunDetailData } from '../hooks/useEventLiveState';
import { formatTime, formatPenalty } from '../utils/formatTime';
import { GatePenalties } from './GatePenalties';
import styles from './RunDetailExpand.module.css';

interface RunDetailExpandProps {
  detail: RunDetailData | null;
  isLoading: boolean;
  isBestRun?: boolean;
  athleteName?: string;
  betterRunNr?: number | null;
}

function TimeBreakdown({ time, pen, total }: {
  time: number | null;
  pen: number | null;
  total: number | null;
}) {
  const penDisplay = formatPenalty(pen);
  return (
    <div className={styles.timeBreakdown}>
      <div className={styles.timeItem}>
        <span className={styles.timeLabel}>Čas</span>
        <span className={styles.timeValue}>{formatTime(time)}</span>
      </div>
      {penDisplay && (
        <div className={styles.timeItem}>
          <span className={styles.timeLabel}>Pen</span>
          <span className={styles.timeValue}>{penDisplay}</span>
        </div>
      )}
      <div className={styles.timeItem}>
        <span className={styles.timeLabel}>Celkem</span>
        <span className={styles.timeValue}>{formatTime(total)}</span>
      </div>
    </div>
  );
}

function RunBlock({ label, isBetter, time, pen, total, gates }: {
  label: string;
  isBetter: boolean;
  time: number | null;
  pen: number | null;
  total: number | null;
  gates: RunDetailData['gates'];
}) {
  return (
    <div className={`${styles.runSection} ${isBetter ? styles.runSectionBetter : ''}`}>
      <div className={styles.runSectionLabel}>
        {label}
        {isBetter && <span className={styles.betterBadge}>lepší</span>}
      </div>
      <TimeBreakdown time={time} pen={pen} total={total} />
      {gates && gates.length > 0 && (
        <div className={styles.gatesSection}>
          <GatePenalties gates={gates} />
        </div>
      )}
    </div>
  );
}

function RunPlaceholder({ label }: { label: string }) {
  return (
    <div className={`${styles.runSection} ${styles.runSectionPlaceholder}`}>
      <div className={styles.runSectionLabel}>{label}</div>
      <div className={styles.timeBreakdown}>
        <div className={styles.timeItem}>
          <span className={styles.timeLabel}>Čas</span>
          <span className={styles.timeValue}>-</span>
        </div>
        <div className={styles.timeItem}>
          <span className={styles.timeLabel}>Celkem</span>
          <span className={styles.timeValue}>-</span>
        </div>
      </div>
    </div>
  );
}

export function RunDetailExpand({ detail, isLoading, isBestRun, athleteName, betterRunNr }: RunDetailExpandProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <SkeletonText />
        <SkeletonText fontSize="sm" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>Detail není k dispozici</div>
      </div>
    );
  }

  // BR race — always show two run blocks
  if (isBestRun) {
    // Server convention: detail.time/gates = better run, detail.prevTime/prevGates = worse run
    // Map to correct run number based on betterRunNr
    const betterRun = { time: detail.time, pen: detail.pen, total: detail.total, gates: detail.gates };
    const worseRun = {
      time: detail.prevTime ?? null,
      pen: detail.prevPen ?? null,
      total: detail.prevTotal ?? null,
      gates: detail.prevGates ?? null,
    };
    const run1 = betterRunNr === 1 ? betterRun : worseRun;
    const run2 = betterRunNr === 2 ? betterRun : worseRun;

    const run1HasData = run1.gates != null;
    const run2HasData = run2.gates != null;

    return (
      <div className={styles.container}>
        {athleteName && <div className={styles.detailHeader}>{athleteName}</div>}
        <div className={styles.runsGrid}>
          {run1HasData ? (
            <RunBlock label="1. jízda" isBetter={betterRunNr === 1} time={run1.time} pen={run1.pen} total={run1.total} gates={run1.gates} />
          ) : (
            <RunPlaceholder label="1. jízda" />
          )}
          {run2HasData ? (
            <RunBlock label="2. jízda" isBetter={betterRunNr === 2} time={run2.time} pen={run2.pen} total={run2.total} gates={run2.gates} />
          ) : (
            <RunPlaceholder label="2. jízda" />
          )}
        </div>
      </div>
    );
  }

  // Single-run race — one block
  return (
    <div className={styles.container}>
      {athleteName && <div className={styles.detailHeader}>{athleteName}</div>}
      <TimeBreakdown time={detail.time} pen={detail.pen} total={detail.total} />
      {detail.gates && detail.gates.length > 0 && (
        <div className={styles.gatesSection}>
          <GatePenalties gates={detail.gates} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update RunDetailExpand.module.css**

Replace `RunDetailExpand.module.css` with:

```css
/**
 * RunDetailExpand styles
 * Clean detail panel with unified time breakdown layout.
 */

.container {
  padding: 0.75rem 0.75rem 0.75rem 2rem;
  background-color: var(--csk-color-bg-secondary, #f9fafb);
  border-left: 3px solid var(--csk-color-primary, #2563eb);
}

.detailHeader {
  font-weight: 600;
  font-size: var(--csk-font-size-sm, 0.875rem);
  color: var(--csk-color-text-primary, #111827);
  margin-bottom: 0.5rem;
}

.noData {
  font-size: var(--csk-font-size-sm, 0.875rem);
  color: var(--csk-color-text-tertiary, #9ca3af);
  font-style: italic;
}

/* --- Time breakdown row --- */
.timeBreakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.timeItem {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.timeLabel {
  font-size: var(--csk-font-size-xs, 0.75rem);
  color: var(--csk-color-text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 500;
}

.timeValue {
  font-family: var(--csk-font-mono, monospace);
  font-size: var(--csk-font-size-sm, 0.875rem);
  color: var(--csk-color-text-primary, #111827);
}

/* --- Gate badges --- */
.gatesSection {
  margin-top: 0.25rem;
}

/* --- BR two-run layout --- */
.runsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .runsGrid {
    grid-template-columns: 1fr;
  }
}

.runSection {
  padding: 0.5rem;
  border-radius: var(--csk-radius-sm, 4px);
  border: 1px solid var(--csk-color-border-secondary, #e5e7eb);
  background: var(--csk-color-bg-primary, #fff);
}

.runSectionBetter {
  border-color: var(--csk-color-primary, #2563eb);
  background: rgba(37, 99, 235, 0.04);
}

.runSectionPlaceholder {
  opacity: 0.5;
}

.runSectionLabel {
  font-size: var(--csk-font-size-xs, 0.75rem);
  font-weight: 600;
  color: var(--csk-color-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.betterBadge {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--csk-color-primary, #2563eb);
  background: rgba(37, 99, 235, 0.1);
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Verify full compilation**

Run: `cd packages/client && npx tsc --noEmit`
Expected: PASS — all type errors resolved.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/components/RunDetailExpand.tsx packages/client/src/components/RunDetailExpand.module.css
git commit -m "feat: unified run detail layout with time breakdown (#143)"
```

---

### Task 4: Smoke test and visual verification

- [ ] **Step 1: Start the server**

Run from project root:
```bash
npx tsx packages/server/src/index.ts &
```

- [ ] **Step 2: Start the client**

```bash
cd packages/client && npx vite &
```

- [ ] **Step 3: Seed test data and verify**

Use the test XML to ingest data:
```bash
# Create event
curl -s -X POST http://localhost:3000/api/v1/admin/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Race","date":"2026-04-13"}' | jq .

# Transition to running
# (use eventId and apiKey from above response)
curl -s -X PATCH http://localhost:3000/api/v1/admin/events/{eventId}/status \
  -H "x-api-key: {apiKey}" \
  -H "Content-Type: application/json" \
  -d '{"status":"startlist"}'

curl -s -X PATCH http://localhost:3000/api/v1/admin/events/{eventId}/status \
  -H "x-api-key: {apiKey}" \
  -H "Content-Type: application/json" \
  -d '{"status":"running"}'

# Ingest XML
curl -s -X POST http://localhost:3000/api/v1/ingest/xml \
  -H "x-api-key: {apiKey}" \
  -H "Content-Type: application/xml" \
  --data-binary @/workspace/timing/c123-server/docs/xboardtest02_jarni_v1.xml
```

- [ ] **Step 4: Take Playwright screenshots**

Use Playwright to screenshot the run detail panel for:
1. A single-run race with expanded detail
2. A BR race with both runs
3. A BR race with one run (if data allows)

Verify:
- Time breakdown shows Čas / Pen / Celkem (not timestamps)
- Reverse gates show italic number with ↑ superscript (no "R")
- BR races show two blocks side by side
- Missing run shows gray placeholder
- No "Brankový průběh" label
- No gate count

- [ ] **Step 5: Commit any fixes**

If visual issues found, fix and commit.

---

### Task 5: Post plan to issue and create PR

- [ ] **Step 1: Post progress update to issue #143**

```bash
gh issue comment 143 --body "Implementation complete. Changes:
- Unified run detail layout across single-run and BR races
- Time breakdown (Čas/Pen/Celkem) replaces absolute timestamps
- Reverse gates styled with italic + ↑ superscript instead of R suffix
- BR races always show both run blocks (placeholder for missing run)
- Removed: gate count, 'Brankový průběh' label"
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat: optimize run detail display (#143)" --body "Closes #143

## Summary
- Unified run detail layout for single-run and BR races
- Replace absolute timestamps with time breakdown (Čas/Pen/Celkem)
- Reverse gates: italic number + superscript ↑ instead of R suffix
- BR races always show two blocks (gray placeholder for missing run)
- Remove gate count and 'Brankový průběh' label

## Test plan
- [ ] Expand single-run result — shows time/pen/total + gate badges
- [ ] Expand BR result with both runs — two blocks side by side
- [ ] Expand BR result with one run — filled block + gray placeholder
- [ ] Reverse gates display italic number with ↑ (no R)
- [ ] Mobile: BR blocks stack vertically
- [ ] No absolute timestamps visible anywhere in detail panel"
```

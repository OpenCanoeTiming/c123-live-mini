# Mobile Results Layout Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile name cell alignment and prevent row height inconsistency by restructuring the layout to `[bib] ☆ Name` / `[cat] Club…` with ellipsis truncation.

**Architecture:** Pure frontend change — restructure the name cell JSX in `ResultList.tsx` (two column builder functions) and update `ResultList.module.css` for flex layout + ellipsis. Extract a shared `NameCell` helper to avoid duplicating the render logic.

**Tech Stack:** React 18, CSS Modules

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/client/src/components/ResultList.tsx` | Modify | Extract `NameCell` component, update both column builders to use it |
| `packages/client/src/components/ResultList.module.css` | Modify | Flex layout for name cell, ellipsis on both lines, club indent |
| `packages/client/src/components/StarButton.module.css` | Modify | Remove `margin-left`, add `flex-shrink: 0` |

---

### Task 1: Restructure name cell JSX

**Files:**
- Modify: `packages/client/src/components/ResultList.tsx:44-64` (standard columns name cell)
- Modify: `packages/client/src/components/ResultList.tsx:160-180` (best-run columns name cell)

Both `buildStandardColumns` and `buildBestRunColumns` have identical name cell render functions. Extract a shared `NameCell` component and use the new layout.

- [ ] **Step 1: Add `NameCell` component above `buildStandardColumns`**

Add this component at line 28 (before `buildStandardColumns`):

```tsx
/** Name cell with [bib] ☆ Name / [cat] Club layout */
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
        <span className={styles.bibBadge}>{row.bib ?? '-'}</span>
        {favorites && row.bib != null && favorites.classId && (
          <StarButton
            active={favorites.isFavorite(row.bib, favorites.classId)}
            onClick={() => favorites.onToggle(row.bib!, favorites.classId!)}
          />
        )}
        <span className={styles.athleteNameText}>{row.name}</span>
      </div>
      {(row.club || row.catId) && (
        <div className={styles.athleteClub}>
          {row.catId && <span className={styles.catTag}>{row.catId}</span>}
          {row.club && <span className={styles.athleteClubText}>{row.club}</span>}
        </div>
      )}
    </div>
  );
}
```

Key changes from current layout:
- `StarButton` moved from after name to between bib and name
- Name text wrapped in `.athleteNameText` span for ellipsis
- Club line has `.catTag` before club text (was on line 1 before)
- Club text wrapped in `.athleteClubText` span for ellipsis
- Outer wrapper gets new `.nameCell` class

- [ ] **Step 2: Update `buildStandardColumns` name cell to use `NameCell`**

Replace the current name column render (lines 48-63) with:

```tsx
    {
      key: 'name',
      header: 'Jméno',
      width: '100%',
      render: (row) => <NameCell row={row} favorites={favoritesParam} />,
    },
```

Where `favoritesParam` is the existing variable built from the `favorites` parameter. Note: rename the local variable inside `buildStandardColumns` — currently the favorites param is used inline. Add this at the top of the function (after `const useCategory`):

```tsx
  const favoritesParam = favorites;
```

Actually, the parameter is already called `favorites` — just use it directly:

```tsx
      render: (row) => <NameCell row={row} favorites={favorites} />,
```

- [ ] **Step 3: Update `buildBestRunColumns` name cell to use `NameCell`**

Replace the current name column render (lines 164-179) with the same pattern:

```tsx
    {
      key: 'name',
      header: 'Jméno',
      width: '100%',
      render: (row) => <NameCell row={row} favorites={favorites} />,
    },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/components/ResultList.tsx
git commit -m "refactor: extract NameCell with [bib] ☆ Name / [cat] Club layout (#140)"
```

---

### Task 2: CSS for flex layout, ellipsis, and club indent

**Files:**
- Modify: `packages/client/src/components/ResultList.module.css:230-296` (athlete name/club styles)
- Modify: `packages/client/src/components/StarButton.module.css:1-17` (remove margin-left, add flex-shrink)

- [ ] **Step 1: Update `.athleteName` to flex row with ellipsis**

Replace the current `.athleteName` block (ResultList.module.css ~line 232-235):

```css
.athleteName {
  font-weight: 500;
  color: var(--csk-color-text-primary, #111827);
}
```

With:

```css
.athleteName {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  font-weight: 500;
  color: var(--csk-color-text-primary, #111827);
  min-width: 0;
}

.athleteNameText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
```

- [ ] **Step 2: Update `.athleteClub` for indent and ellipsis**

Replace the current `.athleteClub` block (~line 237-241):

```css
.athleteClub {
  font-size: var(--csk-font-size-xs, 0.75rem);
  color: var(--csk-color-text-tertiary, #9ca3af);
  margin-top: 0.0625rem;
}
```

With:

```css
.athleteClub {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--csk-font-size-xs, 0.75rem);
  color: var(--csk-color-text-tertiary, #9ca3af);
  margin-top: 0.0625rem;
  /* Indent to align under name text: bibBadge(~1.5rem + 0.3rem padding + 0.3rem margin) + starBtn(28px) + gap */
  padding-left: calc(1.5rem + 0.3rem + 0.375rem + 28px + 0.125rem);
  min-width: 0;
}

.athleteClubText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
```

Note: The `padding-left` calc aligns the club line under where the name text starts — past the bib badge width + its right margin + star button width + the flex gap. The exact value may need visual tuning (see Task 3 verification). A simpler approach: use the same flex structure with invisible spacer — but padding-left is more maintainable.

- [ ] **Step 3: Add `.nameCell` wrapper class**

Add after the `.athleteClubText` rule:

```css
.nameCell {
  min-width: 0;
  overflow: hidden;
}
```

This ensures the table cell content can shrink below its intrinsic width, enabling ellipsis to work.

- [ ] **Step 4: Update `.bibBadge` — add flex-shrink: 0**

In the existing `.bibBadge` rule (~line 272-287), add `flex-shrink: 0;` so it never compresses:

```css
.bibBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.0625rem 0.3rem;
  margin-right: 0.375rem;
  border-radius: 3px;
  background: var(--csk-color-bg-secondary, #f3f4f6);
  border: 1px solid var(--csk-color-border-secondary, #e5e7eb);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--csk-color-text-secondary, #6b7280);
  vertical-align: middle;
  line-height: 1.4;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Update `.catTag` — remove margin-left (now in club line, not after name)**

Replace current `.catTag` (~line 290-296):

```css
.catTag {
  margin-left: 0.375rem;
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--csk-color-text-tertiary, #9ca3af);
  vertical-align: middle;
}
```

With:

```css
.catTag {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--csk-color-text-tertiary, #9ca3af);
  flex-shrink: 0;
}
```

Removed `margin-left` (no longer needed — gap on parent handles spacing) and `vertical-align` (flex child). Added `flex-shrink: 0` so the tag never truncates.

- [ ] **Step 6: Update StarButton.module.css — remove margin-left, add flex-shrink**

In `StarButton.module.css`, update the `.starBtn` rule:

Replace:
```css
  margin-left: 2px;
```

With:
```css
  flex-shrink: 0;
```

The flex gap on `.athleteName` handles spacing now; `margin-left` would create double spacing.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add packages/client/src/components/ResultList.module.css packages/client/src/components/StarButton.module.css
git commit -m "style: flex layout + ellipsis for mobile name cell (#140)"
```

---

### Task 3: Visual verification and tuning

**Files:**
- Potentially adjust: `packages/client/src/components/ResultList.module.css` (padding-left value)

- [ ] **Step 1: Start dev server**

```bash
# Terminal 1 — server
npx tsx packages/server/src/index.ts

# Terminal 2 — client
cd packages/client && npx vite
```

Ensure test event data is available at `http://localhost:5173/#/events/t002` (proxied from staging or local).

- [ ] **Step 2: Screenshot iPhone 13 Mini viewport (375×812) — standard race**

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/playwright-browsers/chromium_headless_shell-1217/chrome-linux/headless_shell'
  });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto('https://c123-live-mini-staging.up.railway.app/#/events/t002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Navigate to a class with results
  const classTab = await page.\\\$('text=K1M');
  if (classTab) await classTab.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/mobile-after.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
"
```

Note: If testing against local dev server, replace URL with `http://localhost:5173`.

- [ ] **Step 3: Screenshot desktop viewport (1280×800) — regression check**

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/playwright-browsers/chromium_headless_shell-1217/chrome-linux/headless_shell'
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://c123-live-mini-staging.up.railway.app/#/events/t002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const classTab = await page.\\\$('text=K1M');
  if (classTab) await classTab.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/desktop-after.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
"
```

- [ ] **Step 4: Visual review checklist**

Verify in screenshots:
- [ ] Club text starts directly under name text (not under bib)
- [ ] Star button is between bib and name
- [ ] Category tag appears on club line before club name
- [ ] Long names truncate with ellipsis (no wrapping)
- [ ] Long club names truncate with ellipsis (no wrapping)
- [ ] All rows have consistent height
- [ ] Desktop layout has no regressions (name + star + cat still readable)
- [ ] BR race view looks correct (both runs visible alongside new name layout)

- [ ] **Step 5: Tune `padding-left` if needed**

If the club line doesn't align perfectly under the name, adjust the `padding-left` value in `.athleteClub`. The calc components:
- `1.5rem` = bibBadge min-width
- `0.3rem` = bibBadge horizontal padding (one side — but it's `0.3rem` on each side, so content width is min-width)
- `0.375rem` = bibBadge margin-right
- `28px` = StarButton width
- `0.125rem` = flex gap

If the alignment is off, switch to a measured approach: set a CSS custom property `--name-indent` and use it on both `.athleteName` (as left padding for non-bib/star content) and `.athleteClub`.

- [ ] **Step 6: Final commit (if tuning was needed)**

```bash
git add packages/client/src/components/ResultList.module.css
git commit -m "style: tune club indent alignment (#140)"
```

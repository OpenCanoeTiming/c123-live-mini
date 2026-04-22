/**
 * @vitest-environment jsdom
 *
 * Regression tests for #162 — per-run DNF/DNS visibility in BR combined
 * results. The combined `status` field is cleared to null as soon as a
 * participant has at least one clean run, which previously caused the
 * client to fall back to displaying the wrong time (e.g. BR2's time on
 * the Run 1 row) or an empty dash instead of the correct DNF badge.
 *
 * The server now surfaces `prevStatus` (BR1) and `currStatus` (BR2)
 * separately on BR results; this suite verifies the client renders each
 * run cell independently.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResultList } from './ResultList';
import type { ResultEntry, ResultsResponse } from '../services/api';

function row(overrides: Partial<ResultEntry> & { name: string }): ResultEntry {
  return {
    rnk: overrides.rnk ?? null,
    bib: overrides.bib ?? null,
    athleteId: overrides.athleteId ?? null,
    name: overrides.name,
    club: overrides.club ?? null,
    noc: overrides.noc ?? null,
    catId: overrides.catId ?? null,
    catRnk: overrides.catRnk ?? null,
    time: overrides.time ?? null,
    pen: overrides.pen ?? null,
    total: overrides.total ?? null,
    totalBehind: overrides.totalBehind ?? null,
    catTotalBehind: overrides.catTotalBehind ?? null,
    status: overrides.status ?? null,
    // Multi-run fields
    betterRunNr: overrides.betterRunNr,
    totalTotal: overrides.totalTotal,
    prevTime: overrides.prevTime,
    prevPen: overrides.prevPen,
    prevTotal: overrides.prevTotal,
    prevRnk: overrides.prevRnk,
    prevStatus: overrides.prevStatus,
    currStatus: overrides.currStatus,
  };
}

function wrap(entries: ResultEntry[]): ResultsResponse {
  return {
    race: { raceId: 'K1M_ST_BR2_6', classId: 'K1M_ST', raceType: 'best-run-2', raceStatus: 3 },
    results: entries,
  };
}

describe('ResultList — BR per-run status (#162)', () => {
  afterEach(() => cleanup());

  it('renders DNF badge in Run 1 cell when BR1 was DNF but BR2 was clean', () => {
    render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: 1,
            total: 9000,   // BR2 primary
            totalTotal: 9000,
            betterRunNr: 2,
            prevTotal: null,   // BR1 had no total (DNF)
            prevStatus: 'DNF', // BR1 DNF
            status: null,      // combined cleared by BR2 clean
            currStatus: null,
          }),
        ])}
      />
    );

    // Desktop Run 1 cell should show a "DNF" badge; Run 2 cell should
    // show the clean BR2 time (90.00). Before the fix Run 1 showed the
    // BR2 time (90.00) and Run 2 showed "-".
    expect(screen.getAllByText('DNF').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90.00').length).toBeGreaterThan(0);
  });

  it('renders DNF badge in Run 2 cell when BR2 was DNF but BR1 was clean', () => {
    render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: 1,
            total: null,     // BR2 DNF, no total
            totalTotal: 10866,
            betterRunNr: 1,
            prevTotal: 10866, // BR1 clean
            prevStatus: null,
            status: null,
            currStatus: 'DNF',
          }),
        ])}
      />
    );

    // Run 2 should show "DNF" badge; Run 1 should show 108.66 (BR1 time).
    expect(screen.getAllByText('DNF').length).toBeGreaterThan(0);
    expect(screen.getAllByText('108.66').length).toBeGreaterThan(0);
  });

  it('renders DNS badge for BR1-only case when BR2 row does not exist yet', () => {
    render(
      <ResultList
        isBestRun
        data={wrap([
          row({
            name: 'Novak J.',
            bib: 1,
            rnk: null,
            total: null,
            totalTotal: null,
            betterRunNr: null,
            prevTotal: null,
            prevStatus: null,       // BR2 doesn't exist; no "prev" to have status
            status: 'DNS',          // combined falls back to single-run status
            currStatus: 'DNS',      // mirrors infoSource (BR1) when only BR1
          }),
        ])}
      />
    );

    expect(screen.getAllByText('DNS').length).toBeGreaterThan(0);
  });

  it('shows Run 1 time and nothing (or "-") for Run 2 when only BR1 has run (clean)', () => {
    render(
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
            prevTotal: null,    // no previous run
            prevStatus: null,
            currStatus: null,
            status: null,
          }),
        ])}
      />
    );

    // Run 1 shows the BR1 time (85.00). Run 2 shows a dash.
    expect(screen.getAllByText('85.00').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('90.00').length).toBe(0);
  });
});

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

    // The old `.brRunLabel` spans no longer exist in the mobile stacked cell.
    const mobileCell = container.querySelector('[class*="brRunsStacked"]');
    expect(mobileCell).not.toBeNull();
    expect(mobileCell!.querySelector('[class*="brRunLabel"]')).toBeNull();
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
    // Missing run 2 slot renders as em-dash placeholder.
    expect(mobileCell!.textContent).toContain('—');
  });
});

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

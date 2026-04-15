/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StartlistTable } from './StartlistTable';
import type { StartlistDisplayRow } from '../services/api';

function row(overrides: Partial<StartlistDisplayRow> & { name: string }): StartlistDisplayRow {
  return {
    startOrder: overrides.startOrder ?? null,
    bib: overrides.bib ?? null,
    athleteId: overrides.athleteId ?? null,
    name: overrides.name,
    club: overrides.club ?? null,
    noc: overrides.noc ?? null,
    catId: overrides.catId ?? null,
    startTime: overrides.startTime ?? null,
    ...(overrides.run1StartTime !== undefined ? { run1StartTime: overrides.run1StartTime } : {}),
    ...(overrides.run2StartTime !== undefined ? { run2StartTime: overrides.run2StartTime } : {}),
  };
}

describe('StartlistTable', () => {
  afterEach(() => cleanup());

  it('renders single "Start" column for non-BR rows', () => {
    render(
      <StartlistTable
        entries={[
          row({ name: 'Novak J.', startTime: '2026-04-11T09:00:00', startOrder: 1, bib: 1 }),
        ]}
      />
    );
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.queryByText('B1')).toBeNull();
    expect(screen.queryByText('B2')).toBeNull();
  });

  it('renders stacked start times with "1." / "2." labels for BR rows', () => {
    render(
      <StartlistTable
        entries={[
          row({
            name: 'Novak J.',
            startOrder: 1,
            bib: 1,
            startTime: '2026-04-11T10:00:00',
            run1StartTime: '2026-04-11T08:00:00',
            run2StartTime: '2026-04-11T10:00:00',
          }),
        ]}
      />
    );
    // Single "Start" header for stacked column
    expect(screen.getByText('Start')).toBeTruthy();
    // Run labels
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
    // Both formatted times present (HH:MM)
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('renders dash for missing run start time (BR1-only entry)', () => {
    render(
      <StartlistTable
        entries={[
          row({
            name: 'Withdraw W.',
            startOrder: 2,
            bib: 99,
            startTime: '2026-04-11T08:01:00',
            run1StartTime: '2026-04-11T08:01:00',
            run2StartTime: null,
          }),
        ]}
      />
    );
    expect(screen.getByText('08:01')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });
});

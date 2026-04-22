/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { ResultList } from './ResultList';
import type { ResultEntry, ResultsResponse } from '../services/api';

function result(overrides: Partial<ResultEntry> & { name: string }): ResultEntry {
  return {
    rnk: overrides.rnk ?? 1,
    bib: overrides.bib ?? 1,
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
  };
}

function buildData(): ResultsResponse {
  return {
    race: {
      raceId: 'R1',
      classId: 'K1M',
      raceType: 'F',
      raceStatus: 2,
    },
    results: [
      result({ name: 'Alpha A.', bib: 1 }),
      result({ name: 'Beta B.', bib: 2 }),
    ],
  };
}

describe('ResultList search reset behavior (#149)', () => {
  afterEach(() => cleanup());

  it('changing searchResetKey remounts the SearchInput so its internal value resets', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <ResultList
        data={buildData()}
        onSearchChange={onSearchChange}
        searchResetKey="K1M|"
      />
    );

    // Type into the uncontrolled SearchInput. The DS component debounces onChange
    // (200ms by default in our wiring), so we just assert the DOM value here —
    // that's what the bug was: DOM value lingered when state moved on.
    const input = screen.getByPlaceholderText('Hledat závodníka...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'alp' } });
    expect(input.value).toBe('alp');

    // Simulate switching class/category — parent will pass a new searchResetKey.
    rerender(
      <ResultList
        data={buildData()}
        onSearchChange={onSearchChange}
        searchResetKey="C1W|"
      />
    );

    // A fresh input instance must be in the DOM (remounted via key change) with an
    // empty value, so the user can see there is no active filter.
    const inputAfter = screen.getByPlaceholderText('Hledat závodníka...') as HTMLInputElement;
    expect(inputAfter.value).toBe('');
  });

  it('stable searchResetKey preserves user-typed text across rerenders', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <ResultList
        data={buildData()}
        onSearchChange={onSearchChange}
        searchResetKey="K1M|"
      />
    );

    const input = screen.getByPlaceholderText('Hledat závodníka...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bet' } });
    expect(input.value).toBe('bet');

    // Unrelated rerender (same key) — DOM value must survive.
    rerender(
      <ResultList
        data={buildData()}
        onSearchChange={onSearchChange}
        searchResetKey="K1M|"
      />
    );

    const inputAfter = screen.getByPlaceholderText('Hledat závodníka...') as HTMLInputElement;
    expect(inputAfter.value).toBe('bet');
  });
});

// Silence unused-import warning in case React strict-mode debounce timers log.
void act;

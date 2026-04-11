/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStartlistMaybeBr } from './api';
import type { StartlistEntry } from './api';

/**
 * Helper to build a minimal startlist entry.
 */
function entry(overrides: Partial<StartlistEntry> & { name: string }): StartlistEntry {
  return {
    startOrder: overrides.startOrder ?? null,
    bib: overrides.bib ?? null,
    athleteId: overrides.athleteId ?? null,
    name: overrides.name,
    club: overrides.club ?? null,
    noc: overrides.noc ?? null,
    catId: overrides.catId ?? null,
    startTime: overrides.startTime ?? null,
  };
}

/**
 * Mock global fetch with a per-URL response map.
 */
function mockFetch(responses: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const path = url.replace(/^\/api\/v1/, '');
    if (path in responses) {
      return new Response(JSON.stringify(responses[path]), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'NotFound', message: 'not found' }), {
      status: 404,
      statusText: 'Not Found',
    });
  });
}

describe('getStartlistMaybeBr', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns plain startlist for non-BR race (no run1/run2 fields)', async () => {
    const startlist = [
      entry({ name: 'Novak J.', athleteId: '100', startTime: '2026-04-11T09:00:00' }),
    ];
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/events/E1/startlist/K1M_Q': {
          race: { raceId: 'K1M_Q', classId: 'K1M', raceType: 'qualification', raceStatus: 1 },
          startlist,
        },
      })
    );

    const rows = await getStartlistMaybeBr('E1', 'K1M_Q');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Novak J.');
    expect(rows[0].run1StartTime).toBeUndefined();
    expect(rows[0].run2StartTime).toBeUndefined();
  });

  it('union-merges BR1 + BR2 by athleteId when both runs exist', async () => {
    const br1 = [
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 1, startTime: '2026-04-11T08:00:00' }),
      entry({ name: 'Svoboda P.', athleteId: '200', startOrder: 2, startTime: '2026-04-11T08:01:00' }),
    ];
    const br2 = [
      // Reverse order in run 2 (typical canoe slalom)
      entry({ name: 'Svoboda P.', athleteId: '200', startOrder: 1, startTime: '2026-04-11T10:00:00' }),
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 2, startTime: '2026-04-11T10:01:00' }),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/events/E1/startlist/K1M_BR2_1': {
          race: { raceId: 'K1M_BR2_1', classId: 'K1M', raceType: 'best-run-2', raceStatus: 1 },
          startlist: br2,
        },
        '/events/E1/startlist/K1M_BR1_1': {
          race: { raceId: 'K1M_BR1_1', classId: 'K1M', raceType: 'best-run-1', raceStatus: 1 },
          startlist: br1,
        },
      })
    );

    const rows = await getStartlistMaybeBr('E1', 'K1M_BR2_1');

    // Order follows BR2 (queried)
    expect(rows.map((r) => r.name)).toEqual(['Svoboda P.', 'Novak J.']);

    // Each row has both run start times
    expect(rows[0].run1StartTime).toBe('2026-04-11T08:01:00');
    expect(rows[0].run2StartTime).toBe('2026-04-11T10:00:00');
    expect(rows[1].run1StartTime).toBe('2026-04-11T08:00:00');
    expect(rows[1].run2StartTime).toBe('2026-04-11T10:01:00');
  });

  it('appends BR1-only entries (DNS in run 2) below BR2 rows', async () => {
    const br1 = [
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 1, startTime: '2026-04-11T08:00:00' }),
      entry({ name: 'Withdraw W.', athleteId: '999', startOrder: 2, startTime: '2026-04-11T08:01:00' }),
    ];
    const br2 = [
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 1, startTime: '2026-04-11T10:00:00' }),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/events/E1/startlist/K1M_BR2_1': {
          race: { raceId: 'K1M_BR2_1', classId: 'K1M', raceType: 'best-run-2', raceStatus: 1 },
          startlist: br2,
        },
        '/events/E1/startlist/K1M_BR1_1': {
          race: { raceId: 'K1M_BR1_1', classId: 'K1M', raceType: 'best-run-1', raceStatus: 1 },
          startlist: br1,
        },
      })
    );

    const rows = await getStartlistMaybeBr('E1', 'K1M_BR2_1');

    expect(rows).toHaveLength(2);
    // BR2 row first
    expect(rows[0].name).toBe('Novak J.');
    expect(rows[0].run1StartTime).toBe('2026-04-11T08:00:00');
    expect(rows[0].run2StartTime).toBe('2026-04-11T10:00:00');
    // BR1-only row appended
    expect(rows[1].name).toBe('Withdraw W.');
    expect(rows[1].run1StartTime).toBe('2026-04-11T08:01:00');
    expect(rows[1].run2StartTime).toBeNull();
  });

  it('falls back to (bib|catId|name) when athleteId is null', async () => {
    const br1 = [
      entry({ name: 'Local L.', athleteId: null, bib: 5, catId: 'K1M', startTime: '08:00' }),
    ];
    const br2 = [
      entry({ name: 'Local L.', athleteId: null, bib: 5, catId: 'K1M', startTime: '10:00' }),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/events/E1/startlist/K1M_BR2_1': {
          race: { raceId: 'K1M_BR2_1', classId: 'K1M', raceType: 'best-run-2', raceStatus: 1 },
          startlist: br2,
        },
        '/events/E1/startlist/K1M_BR1_1': {
          race: { raceId: 'K1M_BR1_1', classId: 'K1M', raceType: 'best-run-1', raceStatus: 1 },
          startlist: br1,
        },
      })
    );

    const rows = await getStartlistMaybeBr('E1', 'K1M_BR2_1');
    expect(rows).toHaveLength(1);
    expect(rows[0].run1StartTime).toBe('08:00');
    expect(rows[0].run2StartTime).toBe('10:00');
  });

  it('fail-soft when paired race 404s — queried side still renders', async () => {
    const br2 = [
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 1, startTime: '2026-04-11T10:00:00' }),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/events/E1/startlist/K1M_BR2_1': {
          race: { raceId: 'K1M_BR2_1', classId: 'K1M', raceType: 'best-run-2', raceStatus: 1 },
          startlist: br2,
        },
        // K1M_BR1_1 intentionally absent → 404
      })
    );

    const rows = await getStartlistMaybeBr('E1', 'K1M_BR2_1');
    expect(rows).toHaveLength(1);
    expect(rows[0].run1StartTime).toBeNull();
    expect(rows[0].run2StartTime).toBe('2026-04-11T10:00:00');
  });

  it('symmetric: BR1 queried also yields both run times', async () => {
    const br1 = [
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 1, startTime: '08:00' }),
    ];
    const br2 = [
      entry({ name: 'Novak J.', athleteId: '100', startOrder: 1, startTime: '10:00' }),
    ];

    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/events/E1/startlist/K1M_BR1_1': {
          race: { raceId: 'K1M_BR1_1', classId: 'K1M', raceType: 'best-run-1', raceStatus: 1 },
          startlist: br1,
        },
        '/events/E1/startlist/K1M_BR2_1': {
          race: { raceId: 'K1M_BR2_1', classId: 'K1M', raceType: 'best-run-2', raceStatus: 1 },
          startlist: br2,
        },
      })
    );

    const rows = await getStartlistMaybeBr('E1', 'K1M_BR1_1');
    expect(rows[0].run1StartTime).toBe('08:00');
    expect(rows[0].run2StartTime).toBe('10:00');
  });

  it('propagates error when primary (queried) race fails', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        // Both absent → primary 404
      })
    );

    await expect(getStartlistMaybeBr('E1', 'K1M_BR2_1')).rejects.toThrow();
  });
});

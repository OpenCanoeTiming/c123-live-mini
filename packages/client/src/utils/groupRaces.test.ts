import { describe, it, expect } from 'vitest';
import {
  groupRaces,
  getPairedBrRaceId,
  pickDefaultDay,
  formatLocalDateYMD,
  type ClassGroup,
  type DayInfo,
} from './groupRaces';
import type { RaceInfo } from '../services/api';

/** Helper to create a minimal RaceInfo stub */
function makeRace(overrides: Partial<RaceInfo> & { raceId: string }): RaceInfo {
  return {
    raceId: overrides.raceId,
    classId: overrides.classId ?? null,
    raceType: overrides.raceType ?? 'final',
    raceOrder: overrides.raceOrder ?? 0,
    raceStatus: overrides.raceStatus ?? 1,
    startTime: overrides.startTime ?? null,
  };
}

describe('groupRaces', () => {
  it('groups races by classId', () => {
    const races = [
      makeRace({ raceId: 'K1M_Q', classId: 'K1M', raceOrder: 1 }),
      makeRace({ raceId: 'C1W_Q', classId: 'C1W', raceOrder: 2 }),
      makeRace({ raceId: 'K1M_F', classId: 'K1M', raceOrder: 3 }),
    ];

    const groups = groupRaces(races);
    expect(groups).toHaveLength(2);
    expect(groups[0].classId).toBe('K1M');
    expect(groups[0].races).toHaveLength(2);
    expect(groups[1].classId).toBe('C1W');
    expect(groups[1].races).toHaveLength(1);
  });

  it('sorts classes by first race raceOrder', () => {
    const races = [
      makeRace({ raceId: 'C1W_F', classId: 'C1W', raceOrder: 5 }),
      makeRace({ raceId: 'K1M_Q', classId: 'K1M', raceOrder: 1 }),
    ];

    const groups = groupRaces(races);
    expect(groups[0].classId).toBe('K1M');
    expect(groups[1].classId).toBe('C1W');
  });

  it('sorts races within group by raceOrder', () => {
    const races = [
      makeRace({ raceId: 'K1M_F', classId: 'K1M', raceOrder: 3 }),
      makeRace({ raceId: 'K1M_Q', classId: 'K1M', raceOrder: 1 }),
      makeRace({ raceId: 'K1M_S', classId: 'K1M', raceOrder: 2 }),
    ];

    const groups = groupRaces(races);
    expect(groups[0].races.map((r) => r.raceId)).toEqual([
      'K1M_Q',
      'K1M_S',
      'K1M_F',
    ]);
  });

  it('groups null classId under "other" and pushes to end', () => {
    const races = [
      makeRace({ raceId: 'unknown', classId: null, raceOrder: 1 }),
      makeRace({ raceId: 'K1M_F', classId: 'K1M', raceOrder: 2 }),
    ];

    const groups = groupRaces(races);
    expect(groups).toHaveLength(2);
    expect(groups[0].classId).toBe('K1M');
    expect(groups[1].classId).toBe('other');
  });

  it('returns empty array for empty input', () => {
    expect(groupRaces([])).toEqual([]);
  });

  describe('displayRaces (BR dedup)', () => {
    it('hides BR1 when BR2 exists', () => {
      const races = [
        makeRace({ raceId: 'K1M_ST_BR1_6', classId: 'K1M_ST', raceType: 'best-run-1', raceOrder: 1 }),
        makeRace({ raceId: 'K1M_ST_BR2_6', classId: 'K1M_ST', raceType: 'best-run-2', raceOrder: 2 }),
      ];

      const groups = groupRaces(races);
      expect(groups[0].displayRaces).toHaveLength(1);
      expect(groups[0].displayRaces[0].raceType).toBe('best-run-2');
    });

    it('keeps BR1 when no BR2 exists', () => {
      const races = [
        makeRace({ raceId: 'K1M_ST_BR1_6', classId: 'K1M_ST', raceType: 'best-run-1', raceOrder: 1 }),
      ];

      const groups = groupRaces(races);
      expect(groups[0].displayRaces).toHaveLength(1);
      expect(groups[0].displayRaces[0].raceType).toBe('best-run-1');
    });

    it('deduplicates multiple BR2 races keeping highest suffix', () => {
      const races = [
        makeRace({ raceId: 'K1M_ST_BR1_3', classId: 'K1M_ST', raceType: 'best-run-1', raceOrder: 1 }),
        makeRace({ raceId: 'K1M_ST_BR2_3', classId: 'K1M_ST', raceType: 'best-run-2', raceOrder: 2 }),
        makeRace({ raceId: 'K1M_ST_BR1_6', classId: 'K1M_ST', raceType: 'best-run-1', raceOrder: 3 }),
        makeRace({ raceId: 'K1M_ST_BR2_6', classId: 'K1M_ST', raceType: 'best-run-2', raceOrder: 4 }),
      ];

      const groups = groupRaces(races);
      // BR1s hidden, only best BR2 (suffix 6) kept
      expect(groups[0].displayRaces).toHaveLength(1);
      expect(groups[0].displayRaces[0].raceId).toBe('K1M_ST_BR2_6');
    });

    it('keeps non-BR races alongside BR2', () => {
      const races = [
        makeRace({ raceId: 'K1M_Q', classId: 'K1M', raceType: 'qualification', raceOrder: 1 }),
        makeRace({ raceId: 'K1M_BR1_3', classId: 'K1M', raceType: 'best-run-1', raceOrder: 2 }),
        makeRace({ raceId: 'K1M_BR2_3', classId: 'K1M', raceType: 'best-run-2', raceOrder: 3 }),
      ];

      const groups = groupRaces(races);
      expect(groups[0].displayRaces).toHaveLength(2);
      expect(groups[0].displayRaces[0].raceType).toBe('qualification');
      expect(groups[0].displayRaces[1].raceType).toBe('best-run-2');
    });
  });
});

describe('getPairedBrRaceId', () => {
  it('swaps BR1 → BR2', () => {
    expect(getPairedBrRaceId('K1M_BR1_1')).toBe('K1M_BR2_1');
  });

  it('swaps BR2 → BR1', () => {
    expect(getPairedBrRaceId('K1M_BR2_1')).toBe('K1M_BR1_1');
  });

  it('handles classId with underscores', () => {
    expect(getPairedBrRaceId('K1M_ST_BR1_6')).toBe('K1M_ST_BR2_6');
    expect(getPairedBrRaceId('K1M_ST_BR2_6')).toBe('K1M_ST_BR1_6');
  });

  it('handles non-numeric suffix', () => {
    expect(getPairedBrRaceId('K1M_BR1_day1')).toBe('K1M_BR2_day1');
  });

  it('returns null for non-BR races', () => {
    expect(getPairedBrRaceId('K1M_Q')).toBeNull();
    expect(getPairedBrRaceId('K1M_F')).toBeNull();
    expect(getPairedBrRaceId('K1M_HEAT_1')).toBeNull();
  });

  it('returns null for malformed BR ids', () => {
    expect(getPairedBrRaceId('K1M_BR3_1')).toBeNull();
    expect(getPairedBrRaceId('BR1_1')).toBeNull();
    expect(getPairedBrRaceId('')).toBeNull();
  });
});

describe('formatLocalDateYMD', () => {
  it('formats local date as YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 22, 10, 30); // April 22, 2026 (month is 0-indexed)
    expect(formatLocalDateYMD(d)).toBe('2026-04-22');
  });

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5, 12, 0); // Jan 5, 2026
    expect(formatLocalDateYMD(d)).toBe('2026-01-05');
  });
});

describe('pickDefaultDay', () => {
  /** Helper to make a DayInfo stub */
  function makeDay(date: string, raceIds: string[] = []): DayInfo {
    const [, m, day] = date.split('-');
    return {
      date,
      label: `${parseInt(day)}.${parseInt(m)}.`,
      raceIds: new Set(raceIds),
    };
  }

  it('returns null for empty day list', () => {
    expect(pickDefaultDay([], [])).toBeNull();
  });

  it("picks today when today's date matches a day", () => {
    const days = [
      makeDay('2026-04-21', ['race-day1']),
      makeDay('2026-04-22', ['race-day2']),
      makeDay('2026-04-23', ['race-day3']),
    ];
    const now = new Date(2026, 3, 22, 14, 0); // April 22
    expect(pickDefaultDay(days, [], now)).toBe('2026-04-22');
  });

  it('picks today even if another day has a running race', () => {
    const days = [
      makeDay('2026-04-21', ['race-running']),
      makeDay('2026-04-22', ['race-today']),
    ];
    const races: RaceInfo[] = [
      {
        raceId: 'race-running',
        classId: 'K1M',
        raceType: 'final',
        raceOrder: 1,
        raceStatus: 2,
        startTime: null,
      },
      {
        raceId: 'race-today',
        classId: 'K1M',
        raceType: 'final',
        raceOrder: 2,
        raceStatus: 0,
        startTime: null,
      },
    ];
    const now = new Date(2026, 3, 22, 10, 0);
    expect(pickDefaultDay(days, races, now)).toBe('2026-04-22');
  });

  it('picks day with running race when today does not match', () => {
    const days = [
      makeDay('2026-04-20', ['race-idle']),
      makeDay('2026-04-21', ['race-running']),
    ];
    const races: RaceInfo[] = [
      {
        raceId: 'race-idle',
        classId: 'K1M',
        raceType: 'final',
        raceOrder: 1,
        raceStatus: 0,
        startTime: null,
      },
      {
        raceId: 'race-running',
        classId: 'K1M',
        raceType: 'final',
        raceOrder: 2,
        raceStatus: 3,
        startTime: null,
      },
    ];
    const now = new Date(2026, 3, 22, 10, 0); // April 22 — no match
    expect(pickDefaultDay(days, races, now)).toBe('2026-04-21');
  });

  it('picks first upcoming day when today is before the event', () => {
    const days = [
      makeDay('2026-05-01', ['race-d1']),
      makeDay('2026-05-02', ['race-d2']),
      makeDay('2026-05-03', ['race-d3']),
    ];
    const now = new Date(2026, 3, 22, 10, 0); // April 22 — before event
    expect(pickDefaultDay(days, [], now)).toBe('2026-05-01');
  });

  it('picks first day when today is after the event (past event)', () => {
    const days = [
      makeDay('2026-04-10', ['race-d1']),
      makeDay('2026-04-11', ['race-d2']),
    ];
    const now = new Date(2026, 3, 22, 10, 0); // April 22 — after event
    expect(pickDefaultDay(days, [], now)).toBe('2026-04-10');
  });

  it('ignores raceStatus=1 (not yet running)', () => {
    const days = [
      makeDay('2026-04-20', ['race-pending']),
      makeDay('2026-04-21', ['race-future']),
    ];
    const races: RaceInfo[] = [
      {
        raceId: 'race-pending',
        classId: 'K1M',
        raceType: 'final',
        raceOrder: 1,
        raceStatus: 1,
        startTime: null,
      },
    ];
    const now = new Date(2026, 3, 22, 10, 0);
    // No today match, no running race — fall through to "first upcoming" (none), then first day
    expect(pickDefaultDay(days, races, now)).toBe('2026-04-20');
  });

  it('handles single-day event (returned as empty by extractDays, but defensive)', () => {
    const days = [makeDay('2026-04-22', ['race-only'])];
    const now = new Date(2026, 3, 22, 10, 0);
    expect(pickDefaultDay(days, [], now)).toBe('2026-04-22');
  });

  it('prefers today over upcoming when both could apply', () => {
    // Today falls on first day of event; don't accidentally pick "upcoming" (second day).
    const days = [
      makeDay('2026-04-22', ['race-d1']),
      makeDay('2026-04-23', ['race-d2']),
    ];
    const now = new Date(2026, 3, 22, 8, 0);
    expect(pickDefaultDay(days, [], now)).toBe('2026-04-22');
  });
});

import { describe, it, expect } from 'vitest';
import { groupRaces, type ClassGroup } from './groupRaces';
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

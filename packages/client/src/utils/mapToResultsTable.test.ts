import { describe, it, expect } from 'vitest';
import { mapResultToDS, mapResultsToDS } from './mapToResultsTable';
import type { ResultEntry } from '../services/api';

function makeResult(overrides: Partial<ResultEntry> = {}): ResultEntry {
  return {
    athleteId: 'ath-1',
    bib: 1,
    name: 'Test Athlete',
    club: 'Club A',
    nat: 'CZE',
    time: 8520,
    pen: 200,
    total: 8720,
    rnk: 1,
    totalBehind: null,
    catRnk: null,
    catTotalBehind: null,
    status: null,
    prevRnk: null,
    ...overrides,
  };
}

describe('mapResultToDS', () => {
  describe('single-run race', () => {
    it('maps basic fields correctly', () => {
      const result = makeResult();
      const ds = mapResultToDS(result, false);

      expect(ds.id).toBe('ath-1');
      expect(ds.name).toBe('Test Athlete');
      expect(ds.club).toBe('Club A');
      expect(ds.startNumber).toBe(1);
      expect(ds.rank).toBe(1);
    });

    it('converts times from hundredths to seconds', () => {
      const result = makeResult({ time: 8520, pen: 200, total: 8720 });
      const ds = mapResultToDS(result, false);

      expect(ds.run1Time).toBe(85.2);
      expect(ds.run1Penalty).toBe(2);
      expect(ds.totalTime).toBe(87.2);
    });

    it('handles null times', () => {
      const result = makeResult({ time: null, pen: null, total: null });
      const ds = mapResultToDS(result, false);

      expect(ds.run1Time).toBeUndefined();
      expect(ds.run1Penalty).toBeUndefined();
      expect(ds.totalTime).toBeUndefined();
    });
  });

  describe('best-run race', () => {
    it('maps both runs when prevTotal exists', () => {
      const result = makeResult({
        time: 9000,
        pen: 0,
        total: 9000,
        prevTime: 9200,
        prevPen: 200,
        prevTotal: 9400,
        totalTotal: 9000,
        betterRunNr: 2,
      });
      const ds = mapResultToDS(result, true);

      expect(ds.run1Time).toBe(92);       // prevTime
      expect(ds.run1Penalty).toBe(2);      // prevPen
      expect(ds.run2Time).toBe(90);        // time (current/primary)
      expect(ds.run2Penalty).toBe(0);      // pen
      expect(ds.totalTime).toBe(90);       // totalTotal (best of both)
    });

    it('maps to run1 slot when only BR1 available', () => {
      const result = makeResult({
        time: 9200,
        pen: 200,
        total: 9400,
        prevTotal: null,
        totalTotal: null,
      });
      const ds = mapResultToDS(result, true);

      expect(ds.run1Time).toBe(92);
      expect(ds.run1Penalty).toBe(2);
      expect(ds.run2Time).toBeUndefined();
      expect(ds.totalTime).toBe(94);       // falls back to total
    });
  });

  describe('status mapping', () => {
    it('maps known statuses', () => {
      expect(mapResultToDS(makeResult({ status: 'dns' }), false).status).toBe('dns');
      expect(mapResultToDS(makeResult({ status: 'dnf' }), false).status).toBe('dnf');
      expect(mapResultToDS(makeResult({ status: 'dsq' }), false).status).toBe('dsq');
    });

    it('returns undefined for null/empty status', () => {
      expect(mapResultToDS(makeResult({ status: null }), false).status).toBeUndefined();
    });
  });

  describe('category rank', () => {
    it('uses catRnk when selectedCatId is set', () => {
      const result = makeResult({ rnk: 5, catRnk: 2, catTotalBehind: '+1.50' });
      const ds = mapResultToDS(result, false, 'cat-1');

      expect(ds.rank).toBe(2);
      expect(ds.timeDiff).toBe(1.5);
    });

    it('uses overall rnk when no selectedCatId', () => {
      const result = makeResult({ rnk: 5, catRnk: 2 });
      const ds = mapResultToDS(result, false);

      expect(ds.rank).toBe(5);
    });
  });

  describe('timeDiff parsing', () => {
    it('parses positive diff', () => {
      const ds = mapResultToDS(makeResult({ totalBehind: '+2.34' }), false);
      expect(ds.timeDiff).toBe(2.34);
    });

    it('parses negative diff', () => {
      const ds = mapResultToDS(makeResult({ totalBehind: '-0.50' }), false);
      expect(ds.timeDiff).toBe(-0.5);
    });

    it('returns undefined for null diff', () => {
      const ds = mapResultToDS(makeResult({ totalBehind: null }), false);
      expect(ds.timeDiff).toBeUndefined();
    });
  });
});

describe('mapResultsToDS', () => {
  it('maps array of results', () => {
    const results = [makeResult({ name: 'A' }), makeResult({ name: 'B' })];
    const mapped = mapResultsToDS(results, false);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].name).toBe('A');
    expect(mapped[1].name).toBe('B');
  });
});

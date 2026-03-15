import { describe, it, expect } from 'vitest';
import { getRaceTypeLabel, isBestRunRace } from './raceTypeLabels';

describe('getRaceTypeLabel', () => {
  it('returns Czech labels for known types', () => {
    expect(getRaceTypeLabel('qualification')).toBe('Kvalifikace');
    expect(getRaceTypeLabel('semifinal')).toBe('Semifinále');
    expect(getRaceTypeLabel('final')).toBe('Finále');
    expect(getRaceTypeLabel('best-run-1')).toBe('1. jízda');
    expect(getRaceTypeLabel('best-run-2')).toBe('2. jízda');
  });

  it('returns raw type for unknown types', () => {
    expect(getRaceTypeLabel('something-new')).toBe('something-new');
  });

  it('returns "Závod" for BR2 when isMergedBR=true', () => {
    expect(getRaceTypeLabel('best-run-2', true)).toBe('Závod');
  });

  it('does not affect BR1 with isMergedBR', () => {
    expect(getRaceTypeLabel('best-run-1', true)).toBe('1. jízda');
  });
});

describe('isBestRunRace', () => {
  it('returns true for best-run types', () => {
    expect(isBestRunRace('best-run-1')).toBe(true);
    expect(isBestRunRace('best-run-2')).toBe(true);
  });

  it('returns false for other types', () => {
    expect(isBestRunRace('final')).toBe(false);
    expect(isBestRunRace('qualification')).toBe(false);
  });
});

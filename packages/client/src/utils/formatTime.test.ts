import { describe, it, expect } from 'vitest';
import { formatTime, formatPenalty } from './formatTime';

describe('formatTime', () => {
  it('converts hundredths to seconds with 2 decimal places', () => {
    expect(formatTime(8520)).toBe('85.20');
    expect(formatTime(10050)).toBe('100.50');
    expect(formatTime(100)).toBe('1.00');
    expect(formatTime(1)).toBe('0.01');
  });

  it('returns dash for null', () => {
    expect(formatTime(null)).toBe('-');
  });

  it('handles zero', () => {
    expect(formatTime(0)).toBe('0.00');
  });
});

describe('formatPenalty', () => {
  it('converts hundredths to penalty seconds', () => {
    expect(formatPenalty(200)).toBe('2');
    expect(formatPenalty(400)).toBe('4');
    expect(formatPenalty(5000)).toBe('50');
  });

  it('returns empty string for zero and null', () => {
    expect(formatPenalty(0)).toBe('');
    expect(formatPenalty(null)).toBe('');
  });
});

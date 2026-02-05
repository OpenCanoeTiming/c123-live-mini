import { describe, it, expect } from 'vitest';
import {
  SHARED_VERSION,
  type Event,
  type EventStatus,
  formatTime,
  formatPenalty,
} from './index';

describe('shared package', () => {
  it('exports SHARED_VERSION', () => {
    expect(SHARED_VERSION).toBe('0.0.1');
  });

  it('Event type allows valid status values', () => {
    const event: Partial<Event> = {
      id: 1,
      eventId: 'TEST.2024010100',
      mainTitle: 'Test Event',
      status: 'draft',
    };
    expect(event.status).toBe('draft');
  });

  it('EventStatus type includes all valid values', () => {
    const statuses: EventStatus[] = [
      'draft',
      'startlist',
      'running',
      'finished',
      'official',
    ];
    expect(statuses).toHaveLength(5);
  });

  it('formatTime converts hundredths to display format', () => {
    expect(formatTime(8520)).toBe('85.20');
    expect(formatTime(10000)).toBe('100.00');
    expect(formatTime(null)).toBe('');
  });

  it('formatPenalty converts hundredths to display format', () => {
    expect(formatPenalty(200)).toBe('2');
    expect(formatPenalty(5000)).toBe('50');
    expect(formatPenalty(0)).toBe('');
    expect(formatPenalty(null)).toBe('');
  });
});

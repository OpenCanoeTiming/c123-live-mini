import { describe, it, expect } from 'vitest';
import { SHARED_VERSION, type Event } from '@c123-live-mini/shared';

describe('server', () => {
  it('can import shared package', () => {
    expect(SHARED_VERSION).toBe('0.0.1');
  });

  it('can use Event type from shared package', () => {
    // Using Partial because we don't need all fields for this test
    const events: Partial<Event>[] = [
      { id: 1, eventId: 'TEST.2024010100', mainTitle: 'Test Event', status: 'draft' },
    ];
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('draft');
    expect(events[0].id).toBe(1);
  });
});

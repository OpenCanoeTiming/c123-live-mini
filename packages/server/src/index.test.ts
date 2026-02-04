import { describe, it, expect } from 'vitest'
import { SHARED_VERSION, type Event } from '@c123-live-mini/shared'

describe('server', () => {
  it('can import shared package', () => {
    expect(SHARED_VERSION).toBe('0.0.1')
  })

  it('can use Event type from shared package', () => {
    const events: Event[] = [
      { id: '1', name: 'Sample Event', status: 'draft' },
    ]
    expect(events).toHaveLength(1)
    expect(events[0].status).toBe('draft')
  })
})

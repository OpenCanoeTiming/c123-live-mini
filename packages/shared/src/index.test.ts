import { describe, it, expect } from 'vitest'
import { SHARED_VERSION, type Event, type EventStatus } from './index'

describe('shared package', () => {
  it('exports SHARED_VERSION', () => {
    expect(SHARED_VERSION).toBe('0.0.1')
  })

  it('Event type allows valid status values', () => {
    const event: Event = {
      id: '1',
      name: 'Test Event',
      status: 'draft',
    }
    expect(event.status).toBe('draft')
  })

  it('EventStatus type includes all valid values', () => {
    const statuses: EventStatus[] = ['draft', 'running', 'finished']
    expect(statuses).toHaveLength(3)
  })
})

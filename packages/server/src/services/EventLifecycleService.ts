import type { Kysely } from 'kysely';
import type { Database } from '../db/schema.js';
import type { EventStatus } from '@c123-live-mini/shared';
import { VALID_TRANSITIONS } from '@c123-live-mini/shared';
import { EventRepository } from '../db/repositories/EventRepository.js';

/**
 * State machine validation result
 */
export interface TransitionValidation {
  valid: boolean;
  error?: string;
  validTransitions?: EventStatus[];
}

/**
 * Event lifecycle service - manages state transitions and validation
 */
export class EventLifecycleService {
  private eventRepo: EventRepository;

  constructor(db: Kysely<Database>) {
    this.eventRepo = new EventRepository(db);
  }

  /**
   * Validate a state transition
   */
  validateTransition(
    currentStatus: EventStatus,
    targetStatus: EventStatus
  ): TransitionValidation {
    const validTransitions = VALID_TRANSITIONS[currentStatus];

    // Check if target status is in the list of valid transitions
    if (!validTransitions.includes(targetStatus)) {
      return {
        valid: false,
        error: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTransitions.join(', ') || 'none'}`,
        validTransitions,
      };
    }

    return { valid: true };
  }

  /**
   * Transition an event to a new state (orchestrates validation + persistence + timestamp)
   */
  async transitionEvent(
    eventId: number,
    targetStatus: EventStatus
  ): Promise<{
    success: boolean;
    previousStatus?: EventStatus;
    statusChangedAt?: string;
    error?: string;
    validTransitions?: EventStatus[];
  }> {
    // Get current event state
    const event = await this.eventRepo.findById(eventId);

    if (!event) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    const currentStatus = event.status as EventStatus;

    // Validate transition
    const validation = this.validateTransition(currentStatus, targetStatus);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        validTransitions: validation.validTransitions,
        previousStatus: currentStatus,
      };
    }

    // Perform transition with timestamp
    const statusChangedAt = new Date().toISOString();
    const updated = await this.eventRepo.updateStatusWithTimestamp(
      eventId,
      targetStatus,
      statusChangedAt
    );

    if (!updated) {
      return {
        success: false,
        error: 'Failed to update event status',
      };
    }

    return {
      success: true,
      previousStatus: currentStatus,
      statusChangedAt,
    };
  }
}

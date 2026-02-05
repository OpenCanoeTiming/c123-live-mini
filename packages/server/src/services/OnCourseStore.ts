import type { OnCourseEntry, OnCourseInput } from '@c123-live-mini/shared';

/**
 * In-memory store for OnCourse data (competitors currently on water)
 *
 * Data is transient and not persisted to database.
 * Key format: `${raceId}-${bib}`
 */
export class OnCourseStore {
  private entries: Map<string, OnCourseEntry> = new Map();
  private eventEntries: Map<string, Set<string>> = new Map();

  /**
   * Generate unique key for an OnCourse entry
   */
  private getKey(raceId: string, bib: number): string {
    return `${raceId}-${bib}`;
  }

  /**
   * Extract eventId from raceId (format: ClassId_DisId_Day)
   * For now, we use the first segment as an approximation
   */
  private extractEventFromRace(raceId: string): string {
    // RaceId format example: K1M-ZS_BR1_25
    // We'll use raceId as the grouping key since we get raceId from the data
    return raceId.split('_')[0] || raceId;
  }

  /**
   * Add or update an OnCourse entry
   */
  add(eventId: string, input: OnCourseInput): OnCourseEntry {
    const key = this.getKey(input.raceId, input.bib);

    const entry: OnCourseEntry = {
      participantId: input.participantId,
      raceId: input.raceId,
      bib: input.bib,
      name: input.name,
      club: input.club,
      position: input.position,
      gates: input.gates,
      completed: input.dtFinish !== null,
      dtStart: input.dtStart,
      dtFinish: input.dtFinish,
      time: input.time,
      pen: input.pen,
      total: input.total ?? null,
      rank: input.rank ?? null,
      ttbDiff: input.ttbDiff ?? null,
      ttbName: input.ttbName ?? null,
    };

    this.entries.set(key, entry);

    // Track entries by eventId
    if (!this.eventEntries.has(eventId)) {
      this.eventEntries.set(eventId, new Set());
    }
    this.eventEntries.get(eventId)!.add(key);

    return entry;
  }

  /**
   * Update an existing OnCourse entry
   */
  update(
    eventId: string,
    raceId: string,
    bib: number,
    updates: Partial<OnCourseInput>
  ): OnCourseEntry | null {
    const key = this.getKey(raceId, bib);
    const existing = this.entries.get(key);

    if (!existing) {
      return null;
    }

    const updated: OnCourseEntry = {
      ...existing,
      ...updates,
      completed: updates.dtFinish !== undefined ? updates.dtFinish !== null : existing.completed,
    };

    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Remove an OnCourse entry
   */
  remove(eventId: string, raceId: string, bib: number): boolean {
    const key = this.getKey(raceId, bib);
    const deleted = this.entries.delete(key);

    if (deleted && this.eventEntries.has(eventId)) {
      this.eventEntries.get(eventId)!.delete(key);
    }

    return deleted;
  }

  /**
   * Get a specific OnCourse entry
   */
  get(raceId: string, bib: number): OnCourseEntry | null {
    const key = this.getKey(raceId, bib);
    return this.entries.get(key) ?? null;
  }

  /**
   * Get all active OnCourse entries for an event
   * Returns entries sorted by position (closest to finish first)
   */
  getAll(eventId: string): OnCourseEntry[] {
    const eventKeys = this.eventEntries.get(eventId);
    if (!eventKeys) {
      return [];
    }

    const entries: OnCourseEntry[] = [];
    for (const key of eventKeys) {
      const entry = this.entries.get(key);
      if (entry && !entry.completed) {
        entries.push(entry);
      }
    }

    // Sort by position (1 = closest to finish)
    return entries.sort((a, b) => a.position - b.position);
  }

  /**
   * Get all entries including completed ones for an event
   */
  getAllIncludingCompleted(eventId: string): OnCourseEntry[] {
    const eventKeys = this.eventEntries.get(eventId);
    if (!eventKeys) {
      return [];
    }

    const entries: OnCourseEntry[] = [];
    for (const key of eventKeys) {
      const entry = this.entries.get(key);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries.sort((a, b) => a.position - b.position);
  }

  /**
   * Remove entries for competitors who have finished
   * Called automatically when dtFinish is set, or can be called manually
   */
  cleanupFinished(eventId: string): number {
    const eventKeys = this.eventEntries.get(eventId);
    if (!eventKeys) {
      return 0;
    }

    let removed = 0;
    const keysToRemove: string[] = [];

    for (const key of eventKeys) {
      const entry = this.entries.get(key);
      if (entry?.completed || entry?.dtFinish !== null) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.entries.delete(key);
      eventKeys.delete(key);
      removed++;
    }

    return removed;
  }

  /**
   * Clear all OnCourse entries for an event
   */
  clearEvent(eventId: string): void {
    const eventKeys = this.eventEntries.get(eventId);
    if (!eventKeys) {
      return;
    }

    for (const key of eventKeys) {
      this.entries.delete(key);
    }

    this.eventEntries.delete(eventId);
  }

  /**
   * Clear all OnCourse data
   */
  clear(): void {
    this.entries.clear();
    this.eventEntries.clear();
  }

  /**
   * Get count of active entries for an event
   */
  getActiveCount(eventId: string): number {
    return this.getAll(eventId).length;
  }

  /**
   * Get total count of entries (including completed) for an event
   */
  getTotalCount(eventId: string): number {
    return this.eventEntries.get(eventId)?.size ?? 0;
  }
}

// Singleton instance for the application
let storeInstance: OnCourseStore | null = null;

/**
 * Get the singleton OnCourseStore instance
 */
export function getOnCourseStore(): OnCourseStore {
  if (!storeInstance) {
    storeInstance = new OnCourseStore();
  }
  return storeInstance;
}

/**
 * Reset the singleton (primarily for testing)
 */
export function resetOnCourseStore(): void {
  if (storeInstance) {
    storeInstance.clear();
  }
  storeInstance = null;
}

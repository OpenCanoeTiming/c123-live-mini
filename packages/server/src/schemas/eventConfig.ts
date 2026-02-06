import { z } from 'zod';

/**
 * Event configuration schema for validation
 */
export const eventConfigSchema = z
  .object({
    activeRaceId: z.string().optional(),
    displayMode: z.enum(['simple', 'detailed']).optional(),
    showOnCourse: z.boolean().optional(),
  })
  .strict();

/**
 * TypeScript type derived from schema
 */
export type EventConfig = z.infer<typeof eventConfigSchema>;

/**
 * Parse and validate event config from JSON string
 */
export function parseEventConfig(jsonString: string | null): EventConfig {
  if (!jsonString) {
    return {};
  }

  try {
    const parsed = JSON.parse(jsonString);
    return eventConfigSchema.parse(parsed);
  } catch {
    // Return empty config on parse errors
    return {};
  }
}

/**
 * Serialize event config to JSON string
 */
export function serializeEventConfig(config: EventConfig): string {
  return JSON.stringify(config);
}

/**
 * Merge partial config into existing config
 */
export function mergeEventConfig(
  existing: EventConfig,
  partial: Partial<EventConfig>
): EventConfig {
  return {
    ...existing,
    ...partial,
  };
}

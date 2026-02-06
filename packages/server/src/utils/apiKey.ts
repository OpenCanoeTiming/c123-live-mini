import { randomBytes } from 'node:crypto';

/**
 * API Key length in bytes (32 bytes = 64 hex characters)
 */
const API_KEY_LENGTH = 32;

/**
 * Days before event start when API key becomes valid
 */
const VALID_BEFORE_START_DAYS = 10;

/**
 * Days after event end when API key expires
 */
const VALID_AFTER_END_DAYS = 5;

/**
 * Generate a secure random API key
 *
 * @returns A 64-character hexadecimal API key
 */
export function generateApiKey(): string {
  return randomBytes(API_KEY_LENGTH).toString('hex');
}

/**
 * Validate API key format
 *
 * @param apiKey - The API key to validate
 * @returns True if the API key has valid format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Must be 64 hexadecimal characters
  return /^[a-f0-9]{64}$/i.test(apiKey);
}

/**
 * Result of API key validity check
 */
export interface ApiKeyValidityResult {
  valid: boolean;
  reason?: string;
  validFrom?: Date;
  validUntil?: Date;
}

/**
 * Check if an API key is valid based on event dates
 *
 * Rules:
 * - If no dates are set, key is always valid (draft event)
 * - Key is valid from 10 days before start_date
 * - Key is valid until 5 days after end_date
 *
 * @param startDate - Event start date (ISO 8601 string or null)
 * @param endDate - Event end date (ISO 8601 string or null)
 * @param now - Current date (optional, defaults to now)
 * @returns Validity result with reason if invalid
 */
export function isApiKeyValid(
  startDate: string | null,
  endDate: string | null,
  now: Date = new Date()
): ApiKeyValidityResult {
  // If no dates set, key is always valid (draft event)
  if (!startDate && !endDate) {
    return { valid: true };
  }

  let validFrom: Date | undefined;
  let validUntil: Date | undefined;

  // Calculate validity window start (10 days before start)
  if (startDate) {
    const start = new Date(startDate);
    validFrom = new Date(start);
    validFrom.setDate(validFrom.getDate() - VALID_BEFORE_START_DAYS);

    if (now < validFrom) {
      return {
        valid: false,
        reason: `Key not yet valid. Valid from ${validFrom.toISOString()}`,
        validFrom,
        validUntil,
      };
    }
  }

  // Calculate validity window end (5 days after end)
  if (endDate) {
    const end = new Date(endDate);
    validUntil = new Date(end);
    validUntil.setDate(validUntil.getDate() + VALID_AFTER_END_DAYS);

    if (now > validUntil) {
      return {
        valid: false,
        reason: `Key expired on ${validUntil.toISOString()}`,
        validFrom,
        validUntil,
      };
    }
  }

  return { valid: true, validFrom, validUntil };
}

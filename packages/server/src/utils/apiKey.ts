import { randomBytes } from 'node:crypto';

/**
 * API Key length in bytes (32 bytes = 64 hex characters)
 */
const API_KEY_LENGTH = 32;

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

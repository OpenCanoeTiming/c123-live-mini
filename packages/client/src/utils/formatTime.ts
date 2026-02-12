/**
 * Time formatting utilities for canoe slalom results.
 *
 * All times from the API are in hundredths of a second.
 */

/**
 * Format time from hundredths to display format.
 * e.g., 8520 → "85.20", 10050 → "100.50"
 */
export function formatTime(hundredths: number | null): string {
  if (hundredths === null) return '-';
  const seconds = hundredths / 100;
  return seconds.toFixed(2);
}

/**
 * Format penalty from hundredths.
 * e.g., 200 → "2", 400 → "4", 0 → ""
 */
export function formatPenalty(hundredths: number | null): string {
  if (hundredths === null || hundredths === 0) return '';
  return String(hundredths / 100);
}

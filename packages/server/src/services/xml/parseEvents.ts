import type { XmlEvent, ParsedEvent } from './types.js';

/**
 * Parse date string to ISO 8601 date only (YYYY-MM-DD)
 */
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // C123 format: "2024-06-25T18:13:01+02:00" -> "2024-06-25"
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Parse Events section from XML
 */
export function parseEvents(
  events: XmlEvent | XmlEvent[] | undefined
): ParsedEvent | null {
  if (!events) return null;

  // Events can be single object or array, we take the first one
  const event = Array.isArray(events) ? events[0] : events;
  if (!event) return null;

  return {
    eventId: event.EventId,
    mainTitle: event.MainTitle,
    subTitle: event.SubTitle || null,
    location: event.Location || null,
    facility: event.Facility || null,
    startDate: parseDate(event.StartDate),
    endDate: parseDate(event.EndDate),
    discipline: event.CanoeDiscipline || null,
  };
}

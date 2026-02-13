import type {
  WsFullPayload,
  PublicEventDetail,
  PublicClass,
  PublicRace,
  PublicAggregatedCategory,
} from '@c123-live-mini/shared';
import type { EventRepository } from '../db/repositories/EventRepository.js';
import type { ClassRepository } from '../db/repositories/ClassRepository.js';
import type { RaceRepository } from '../db/repositories/RaceRepository.js';

/**
 * Compose full state payload from database entities
 *
 * This helper centralizes the mapping logic from DB entities to public API types.
 * Used by:
 * - WebSocket initial state (on connect)
 * - XML import broadcast
 *
 * @param eventId - Event identifier
 * @param eventRepo - Event repository instance
 * @param classRepo - Class repository instance
 * @param raceRepo - Race repository instance
 * @returns Full state payload or null if event not found
 */
export async function composeFullStatePayload(
  eventId: string,
  eventRepo: EventRepository,
  classRepo: ClassRepository,
  raceRepo: RaceRepository
): Promise<WsFullPayload | null> {
  // Fetch event
  const event = await eventRepo.findByEventId(eventId);
  if (!event) {
    return null;
  }

  // Fetch related entities
  const classes = await classRepo.findByEventIdWithCategories(event.id);
  const races = await raceRepo.findByEventId(event.id);
  const categories = await classRepo.getCategoriesForEvent(event.id);

  // Compose payload
  return {
    event: {
      eventId: event.event_id,
      mainTitle: event.main_title,
      subTitle: event.sub_title,
      location: event.location,
      startDate: event.start_date,
      endDate: event.end_date,
      discipline: event.discipline,
      status: event.status as PublicEventDetail['status'],
      facility: event.facility,
    },
    classes: classes.map((cls) => ({
      classId: cls.class_id,
      name: cls.name,
      longTitle: cls.long_title,
      categories: cls.categories.map((cat) => ({
        catId: cat.cat_id,
        name: cat.name,
        firstYear: cat.first_year,
        lastYear: cat.last_year,
      })),
    })) as PublicClass[],
    races: races.map((race) => ({
      raceId: race.race_id,
      classId: race.class_id,
      raceType: race.race_type as PublicRace['raceType'],
      raceOrder: race.race_order,
      startTime: race.start_time,
      raceStatus: race.race_status,
    })),
    categories: categories as PublicAggregatedCategory[],
  };
}

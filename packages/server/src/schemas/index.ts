/**
 * Fastify JSON Schema validation definitions
 * Based on contracts/api.md specification
 */

// ============================================================================
// Common Schemas
// ============================================================================

export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['error', 'message'],
} as const;

// ============================================================================
// Events Schemas
// ============================================================================

export const eventsListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              eventId: { type: 'string' },
              mainTitle: { type: 'string' },
              subTitle: { type: ['string', 'null'] },
              location: { type: ['string', 'null'] },
              startDate: { type: ['string', 'null'] },
              endDate: { type: ['string', 'null'] },
              status: { type: 'string' },
            },
            required: ['id', 'eventId', 'mainTitle', 'status'],
          },
        },
      },
      required: ['events'],
    },
  },
} as const;

export const eventDetailParamsSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
  },
  required: ['eventId'],
} as const;

export const eventDetailSchema = {
  params: eventDetailParamsSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        event: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            eventId: { type: 'string' },
            mainTitle: { type: 'string' },
            subTitle: { type: ['string', 'null'] },
            location: { type: ['string', 'null'] },
            facility: { type: ['string', 'null'] },
            startDate: { type: ['string', 'null'] },
            endDate: { type: ['string', 'null'] },
            discipline: { type: ['string', 'null'] },
            status: { type: 'string' },
          },
          required: ['id', 'eventId', 'mainTitle', 'status'],
        },
        classes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              classId: { type: 'string' },
              name: { type: 'string' },
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    catId: { type: 'string' },
                    name: { type: 'string' },
                    firstYear: { type: ['integer', 'null'] },
                    lastYear: { type: ['integer', 'null'] },
                  },
                  required: ['catId', 'name'],
                },
              },
            },
            required: ['classId', 'name', 'categories'],
          },
        },
        races: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              raceId: { type: 'string' },
              classId: { type: ['string', 'null'] },
              disId: { type: 'string' },
              raceOrder: { type: ['integer', 'null'] },
              startTime: { type: ['string', 'null'] },
              raceStatus: { type: 'integer' },
            },
            required: ['raceId', 'disId', 'raceStatus'],
          },
        },
      },
      required: ['event', 'classes', 'races'],
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================================================
// Results Schemas
// ============================================================================

export const resultsParamsSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
    raceId: { type: 'string' },
  },
  required: ['eventId', 'raceId'],
} as const;

export const resultsQuerySchema = {
  type: 'object',
  properties: {
    catId: { type: 'string' },
    detailed: { type: 'string' },
    includeAllRuns: { type: 'string' },
  },
} as const;

export const resultsSchema = {
  params: resultsParamsSchema,
  querystring: resultsQuerySchema,
  response: {
    200: {
      type: 'object',
      properties: {
        race: {
          type: 'object',
          properties: {
            raceId: { type: 'string' },
            classId: { type: ['string', 'null'] },
            disId: { type: 'string' },
            raceStatus: { type: 'integer' },
          },
          required: ['raceId', 'disId', 'raceStatus'],
        },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rnk: { type: ['integer', 'null'] },
              bib: { type: ['integer', 'null'] },
              participantId: { type: 'string' },
              name: { type: 'string' },
              club: { type: ['string', 'null'] },
              noc: { type: ['string', 'null'] },
              catId: { type: ['string', 'null'] },
              catRnk: { type: ['integer', 'null'] },
              time: { type: ['integer', 'null'] },
              pen: { type: ['integer', 'null'] },
              total: { type: ['integer', 'null'] },
              totalBehind: { type: ['string', 'null'] },
              status: { type: ['string', 'null'] },
              gates: {
                type: 'array',
                items: { type: ['integer', 'null'] },
              },
              betterRunNr: { type: ['integer', 'null'] },
              totalTotal: { type: ['integer', 'null'] },
              prevTime: { type: ['integer', 'null'] },
              prevPen: { type: ['integer', 'null'] },
              prevTotal: { type: ['integer', 'null'] },
              prevRnk: { type: ['integer', 'null'] },
              runs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    runNr: { type: 'integer' },
                    raceId: { type: 'string' },
                    time: { type: ['integer', 'null'] },
                    pen: { type: ['integer', 'null'] },
                    total: { type: ['integer', 'null'] },
                    rnk: { type: ['integer', 'null'] },
                    gates: {
                      type: 'array',
                      items: { type: ['integer', 'null'] },
                    },
                  },
                  required: ['runNr', 'raceId'],
                },
              },
            },
            required: ['participantId', 'name'],
          },
        },
      },
      required: ['race', 'results'],
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================================================
// Startlist Schemas
// ============================================================================

export const startlistParamsSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
    raceId: { type: 'string' },
  },
  required: ['eventId', 'raceId'],
} as const;

export const startlistSchema = {
  params: startlistParamsSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        race: {
          type: 'object',
          properties: {
            raceId: { type: 'string' },
            classId: { type: ['string', 'null'] },
            startTime: { type: ['string', 'null'] },
          },
          required: ['raceId'],
        },
        startlist: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              startOrder: { type: ['integer', 'null'] },
              bib: { type: ['integer', 'null'] },
              participantId: { type: 'string' },
              name: { type: 'string' },
              club: { type: ['string', 'null'] },
              noc: { type: ['string', 'null'] },
              startTime: { type: ['string', 'null'] },
            },
            required: ['participantId', 'name'],
          },
        },
      },
      required: ['race', 'startlist'],
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================================================
// OnCourse Schemas
// ============================================================================

export const oncourseParamsSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
  },
  required: ['eventId'],
} as const;

export const oncourseSchema = {
  params: oncourseParamsSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        oncourse: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              position: { type: 'integer' },
              raceId: { type: 'string' },
              bib: { type: 'integer' },
              participantId: { type: 'string' },
              name: { type: 'string' },
              club: { type: ['string', 'null'] },
              gates: {
                type: 'array',
                items: { type: ['integer', 'null'] },
              },
              dtStart: { type: ['string', 'null'] },
              dtFinish: { type: ['string', 'null'] },
              time: { type: ['integer', 'null'] },
              pen: { type: ['integer', 'null'] },
              total: { type: ['integer', 'null'] },
              rank: { type: ['integer', 'null'] },
              ttbDiff: { type: ['string', 'null'] },
              ttbName: { type: ['string', 'null'] },
            },
            required: ['position', 'raceId', 'bib', 'participantId', 'name'],
          },
        },
      },
      required: ['oncourse'],
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================================================
// Categories Schemas
// ============================================================================

export const categoriesParamsSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
  },
  required: ['eventId'],
} as const;

export const categoriesSchema = {
  params: categoriesParamsSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              catId: { type: 'string' },
              name: { type: 'string' },
              firstYear: { type: ['integer', 'null'] },
              lastYear: { type: ['integer', 'null'] },
              classIds: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['catId', 'name', 'classIds'],
          },
        },
      },
      required: ['categories'],
    },
    404: errorResponseSchema,
  },
} as const;

// ============================================================================
// Admin Schemas
// ============================================================================

export const createEventBodySchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
    mainTitle: { type: 'string' },
    subTitle: { type: 'string' },
    location: { type: 'string' },
    facility: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    discipline: { type: 'string' },
  },
  required: ['eventId', 'mainTitle'],
} as const;

export const createEventSchema = {
  body: createEventBodySchema,
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        eventId: { type: 'string' },
        apiKey: { type: 'string' },
      },
      required: ['id', 'eventId', 'apiKey'],
    },
    400: errorResponseSchema,
    409: errorResponseSchema,
  },
} as const;

// ============================================================================
// Ingest Schemas
// ============================================================================

export const ingestXmlBodySchema = {
  type: 'object',
  properties: {
    xml: { type: 'string' },
  },
  required: ['xml'],
} as const;

export const ingestXmlSchema = {
  body: ingestXmlBodySchema,
  response: {
    200: {
      type: 'object',
      properties: {
        imported: {
          type: 'object',
          properties: {
            participants: { type: 'integer' },
            classes: { type: 'integer' },
            races: { type: 'integer' },
            results: { type: 'integer' },
            courses: { type: 'integer' },
          },
        },
      },
      required: ['imported'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
} as const;

export const ingestOncourseBodySchema = {
  type: 'object',
  properties: {
    oncourse: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          participantId: { type: 'string' },
          raceId: { type: 'string' },
          bib: { type: 'integer' },
          name: { type: 'string' },
          club: { type: 'string' },
          position: { type: 'integer' },
          gates: {
            type: 'array',
            items: { type: ['integer', 'null'] },
          },
          dtStart: { type: 'string' },
          dtFinish: { type: ['string', 'null'] },
          time: { type: 'integer' },
          pen: { type: 'integer' },
        },
        required: ['participantId', 'raceId', 'bib'],
      },
    },
  },
  required: ['oncourse'],
} as const;

export const ingestOncourseSchema = {
  body: ingestOncourseBodySchema,
  response: {
    200: {
      type: 'object',
      properties: {
        active: { type: 'integer' },
      },
      required: ['active'],
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
  },
} as const;

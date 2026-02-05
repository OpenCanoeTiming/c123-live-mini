/**
 * Application-specific error classes
 * Following contracts/api.md error response format
 */

/**
 * Base application error with status code
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: this.error,
      message: this.message,
    };
  }
}

/**
 * 400 Bad Request - Invalid request data
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'Invalid request', message);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized - Invalid or missing authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Invalid or missing API key') {
    super(401, 'Unauthorized', message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(404, 'Not found', `${resource} not found: ${identifier}`);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends AppError {
  constructor(resource: string, identifier: string) {
    super(409, 'Conflict', `${resource} already exists: ${identifier}`);
    this.name = 'ConflictError';
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super(500, 'Internal error', message);
    this.name = 'InternalError';
  }
}

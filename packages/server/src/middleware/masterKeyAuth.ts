import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Master Key header name
 */
export const MASTER_KEY_HEADER = 'x-master-key';

/**
 * Timing-safe string comparison
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Create master key authentication middleware
 *
 * Verifies X-Master-Key header against configured master passwords.
 * If no master passwords are configured, the middleware is a no-op
 * (backward compatibility for development).
 */
export function createMasterKeyAuth(masterPasswords: string[]) {
  return async function masterKeyAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // If no master passwords configured, skip auth (dev mode)
    if (masterPasswords.length === 0) return;

    const masterKey = request.headers[MASTER_KEY_HEADER];

    if (!masterKey || Array.isArray(masterKey)) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid X-Master-Key header',
      });
      return;
    }

    const isValid = masterPasswords.some((pw) => safeCompare(masterKey, pw));

    if (!isValid) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid master key',
      });
      return;
    }
  };
}

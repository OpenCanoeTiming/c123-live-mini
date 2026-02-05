/**
 * Simple logger for repository and service operations
 * Uses console methods that can be captured by Fastify's pino logger
 */

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Format log message with optional data
 */
function formatMessage(
  level: string,
  component: string,
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] [${component}] ${message}${dataStr}`;
}

/**
 * Create a logger instance for a specific component
 */
export function createLogger(component: string): Logger {
  const isDebug = process.env.LOG_LEVEL === 'debug';

  return {
    debug(message: string, data?: Record<string, unknown>): void {
      if (isDebug) {
        console.debug(formatMessage('DEBUG', component, message, data));
      }
    },
    info(message: string, data?: Record<string, unknown>): void {
      console.info(formatMessage('INFO', component, message, data));
    },
    warn(message: string, data?: Record<string, unknown>): void {
      console.warn(formatMessage('WARN', component, message, data));
    },
    error(message: string, data?: Record<string, unknown>): void {
      console.error(formatMessage('ERROR', component, message, data));
    },
  };
}

// Pre-created loggers for common components
export const repoLogger = createLogger('Repository');
export const serviceLogger = createLogger('Service');

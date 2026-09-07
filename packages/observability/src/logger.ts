import pino from 'pino'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const REDACTED = '[redacted]'
/**
 * `email`/`phone`/`document`/`address` cover `security.md`'s Level 3/4
 * examples (NFR-10) by key name, a fail-safe net for a future call site that
 * logs one of them directly rather than a domain-scoped extract (the way
 * `emailDomain` in `auth.routes.ts` already avoids logging a full address).
 * `name` stays out: it is also `spanName`, an error's own `.name`, a
 * category or organization name - redacting it would erase useful,
 * non-sensitive observability data far more often than it would catch a
 * real leak.
 */
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|token|secret|password|credential|session|otp|backup|private|key|email|phone|document|address/i
const isDevelopment = process.env.NODE_ENV === 'development'

const logger = pino({
  base: undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  level: process.env.LOG_LEVEL ?? 'info',
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  transport: isDevelopment
    ? {
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          messageKey: 'message',
          translateTime: 'SYS:standard',
        },
        target: 'pino-pretty',
      }
    : undefined,
})

export type LogEvent = {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

export const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (depth > 4) {
    return '[truncated]'
  }

  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
    }
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(item, depth + 1),
      ]),
    )
  }

  return value
}

export const logEvent = (event: LogEvent) => {
  const payload = {
    context: sanitizeValue(event.context),
  }

  logger[event.level](payload, event.message)
}

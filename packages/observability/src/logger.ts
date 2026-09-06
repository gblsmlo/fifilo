import pino from 'pino'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const REDACTED = '[redacted]'
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|token|secret|password|credential|session|otp|backup|private|key/i
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

const sanitizeValue = (value: unknown, depth = 0): unknown => {
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

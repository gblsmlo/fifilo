import { describe, expect, mock, test } from 'bun:test'

describe('@fifilo/observability package surface', () => {
  test('declares the development formatter in the owning package', async () => {
    const manifest = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as {
      dependencies?: Record<string, string>
    }

    expect(manifest.dependencies?.['pino-pretty']).toBeDefined()
  })

  test('keeps the root import pure and initializes Pino only through runtime', async () => {
    let loggerInitializations = 0
    const logCalls: Array<{ level: string; message: string; payload: unknown }> = []
    mock.module('pino', () => ({
      default: () => {
        loggerInitializations += 1
        return {
          debug: (payload: unknown, message: string) =>
            logCalls.push({ level: 'debug', message, payload }),
          error: (payload: unknown, message: string) =>
            logCalls.push({ level: 'error', message, payload }),
          info: (payload: unknown, message: string) =>
            logCalls.push({ level: 'info', message, payload }),
          warn: (payload: unknown, message: string) =>
            logCalls.push({ level: 'warn', message, payload }),
        }
      },
    }))

    const root = await import('./index')

    expect(loggerInitializations).toBe(0)
    expect(root.createObservabilityContext).toBeFunction()
    expect('logEvent' in root).toBe(false)

    const runtime = await import('./runtime')

    expect(loggerInitializations).toBe(1)
    expect(runtime.auditEvent).toBeFunction()
    expect(runtime.logEvent).toBeFunction()
    expect(runtime.traceHttpRequest).toBeFunction()

    runtime.logEvent({
      context: { password: 'secret', visible: 'value' },
      level: 'info',
      message: 'safe.event',
    })
    runtime.auditEvent({ action: 'read', actorType: 'system' })
    await runtime.traceOperation({ name: 'surface.test' }, async () => 'result')

    expect(logCalls[0]).toEqual({
      level: 'info',
      message: 'safe.event',
      payload: { context: { password: '[redacted]', visible: 'value' } },
    })
    expect(logCalls.map((call) => call.message)).toEqual([
      'safe.event',
      'audit.event',
      'trace.start',
      'trace.end',
    ])
  })
})

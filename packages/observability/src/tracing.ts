import { type ObservabilityContext, createHttpContext } from './context'
import { logEvent } from './logger'

type TraceOptions = {
  context?: Partial<ObservabilityContext>
  metadata?: Record<string, unknown>
  name: string
}

const now = () => performance.now()

export const traceOperation = async <T>(
  options: TraceOptions,
  operation: (context: ObservabilityContext) => Promise<T> | T,
): Promise<T> => {
  const startedAt = now()
  const context = {
    requestId: options.context?.requestId ?? crypto.randomUUID(),
    ...options.context,
  } satisfies ObservabilityContext

  logEvent({
    level: 'info',
    message: 'trace.start',
    context: {
      ...context,
      metadata: options.metadata,
      spanName: options.name,
    },
  })

  try {
    const result = await operation(context)
    logEvent({
      level: 'info',
      message: 'trace.end',
      context: {
        ...context,
        durationMs: Math.round(now() - startedAt),
        metadata: options.metadata,
        spanName: options.name,
      },
    })
    return result
  } catch (error) {
    logEvent({
      level: 'error',
      message: 'trace.error',
      context: {
        ...context,
        durationMs: Math.round(now() - startedAt),
        error,
        metadata: options.metadata,
        spanName: options.name,
      },
    })
    throw error
  }
}

export const traceHttpRequest = async <T>(
  request: Request,
  operation: (context: ObservabilityContext) => Promise<T> | T,
): Promise<T> => {
  const context = createHttpContext(request)
  return traceOperation(
    {
      context,
      metadata: {
        method: request.method,
        path: new URL(request.url).pathname,
      },
      name: 'http.request',
    },
    operation,
  )
}

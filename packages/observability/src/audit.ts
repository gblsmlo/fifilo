import type { ObservabilityContext } from './context'
import { logEvent } from './logger'

export type AuditActorType = 'system' | 'user' | 'worker'

export type AuditEvent = {
  action: string
  actorId?: string
  actorType: AuditActorType
  afterRef?: string
  beforeRef?: string
  entityId?: string
  entityType?: string
  metadata?: Record<string, unknown>
  requestId?: string
  workspaceId?: string
}

export const auditEvent = (event: AuditEvent, context?: Partial<ObservabilityContext>) => {
  logEvent({
    level: 'info',
    message: 'audit.event',
    context: {
      ...context,
      ...event,
      eventType: 'audit',
    },
  })
}

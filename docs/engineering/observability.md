# Observability and technical audit

Context, logs, traces and technical audit belong to `packages/observability`.
The root barrel exports types and the request context only; it builds no Pino
and reads no environment. Runtime comes through `@twincam/observability/runtime`.

## Surface

```text
packages/observability/src/
  context.ts     requestId, route, actorId, workspaceId
  logger.ts      JSON logs and redaction of sensitive fields
  tracing.ts     traceOperation and traceHttpRequest
  audit.ts       auditEvent, append-only through the structured log
  runtime.ts     public runtime surface: logger, tracing, audit
  index.ts       types and context only
```

A test in the package mocks `pino` and proves that importing the root
initializes no logger and that `./runtime` initializes exactly one.

## Rules

- In production every log is a single-line JSON event through `pino`. In
  development `pino-pretty` formats the same events; the package declares it.
- `requestId` accompanies requests, errors and audit events. `x-request-id` is
  honored when the caller sends it.
- `workspaceId` enters the context only after the session, the membership or
  the job validated it.
- Keys matching authorization, cookie, token, secret, password, credential,
  session, OTP, backup, private or key are redacted by default. Logs never carry
  full message bodies, documents, full headers or third-party payloads.
- Audit actions are stable dotted strings, such as
  `organization.invitation.created` or `organization.member.removed`.
- A trace records start, end, error and duration in milliseconds. OpenTelemetry
  exporters can be added later without changing the adapters' public API.

## Usage

```ts
import { traceHttpRequest } from '@twincam/observability/runtime'

app.get('/health', ({ request }) => traceHttpRequest(request, () => createHealthResponse()))
```

```ts
import { auditEvent } from '@twincam/observability/runtime'

auditEvent({
  action: 'organization.member.removed',
  actorType: 'system',
  entityId: member.id,
  entityType: 'member',
  workspaceId: organization.id,
})
```

A type-only consumer imports from the root:

```ts
import type { LogEvent } from '@twincam/observability'
```

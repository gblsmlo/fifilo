import { z } from 'zod'

export const badRequest = (message: string) => ({
  error: {
    code: 'invalid_request',
    message,
  },
})

export const internalError = (message: string) => ({
  error: {
    code: 'internal_error',
    message,
  },
})

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/**
 * Error contract shared by every route module that delegates to a use case.
 * `toHttpErrorResponse` maps the whole `DomainErrorKind` set onto exactly these
 * five statuses, so declaring them as one object keeps the Eden error union
 * identical across modules instead of drifting per file.
 */
export const errorStatuses = {
  400: errorEnvelopeSchema,
  401: errorEnvelopeSchema,
  403: errorEnvelopeSchema,
  404: errorEnvelopeSchema,
  409: errorEnvelopeSchema,
} as const

/**
 * Opt-in per route: only for handlers that can still fail after validation and
 * authorization passed. `toHttpErrorResponse` never produces a 500.
 */
export const internalErrorStatus = {
  500: errorEnvelopeSchema,
} as const

export const handleValidationError = () => badRequest('Revise os dados enviados e tente novamente.')

export const mapValidationError = ({
  code,
  set,
}: {
  code: string | number
  set: { status?: number | string }
}) => {
  if (code === 'VALIDATION') {
    set.status = 400
    return handleValidationError()
  }
}

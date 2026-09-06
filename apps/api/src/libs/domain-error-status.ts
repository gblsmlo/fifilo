import type { DomainError, DomainErrorKind } from '@twincam/core/errors'

export type HttpErrorResponse = {
  body: {
    error: {
      code: string
      message: string
    }
  }
  status: 400 | 401 | 403 | 404 | 409
}

const statusByDomainErrorKind = {
  conflict: 409,
  forbidden: 403,
  not_found: 404,
  unauthorized: 401,
  validation: 400,
} satisfies Record<DomainErrorKind, HttpErrorResponse['status']>

export const toHttpErrorResponse = (error: DomainError): HttpErrorResponse => ({
  body: {
    error: {
      code: error.code,
      message: error.message,
    },
  },
  status: statusByDomainErrorKind[error.kind],
})

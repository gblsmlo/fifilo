interface ErrorLike {
  code?: unknown
  error?: unknown
  message?: unknown
  status?: unknown
}

const asErrorLike = (value: unknown): ErrorLike | undefined =>
  value && typeof value === 'object' ? (value as ErrorLike) : undefined

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const readField = (value: unknown, field: 'code' | 'message'): string | undefined => {
  const candidate = asErrorLike(value)
  if (!candidate) return undefined
  const nested = asErrorLike(candidate.error)
  return asString(candidate[field]) ?? asString(nested?.[field])
}

export class AccountRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AccountRequestError'
  }
}

export function normalizeAccountRequestError(
  error: unknown,
  fallbackMessage: string,
): AccountRequestError {
  const candidate = asErrorLike(error)
  const status = typeof candidate?.status === 'number' ? candidate.status : 500

  return new AccountRequestError(
    readField(error, 'message') ?? fallbackMessage,
    readField(error, 'code') ?? 'unknown_error',
    status,
  )
}

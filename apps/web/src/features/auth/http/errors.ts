interface AuthErrorLike {
  code?: unknown
  error?: unknown
  message?: unknown
  status?: unknown
}

const getNestedError = (value: unknown): AuthErrorLike | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  return value as AuthErrorLike
}

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const getCode = (value: unknown): string | undefined => {
  const candidate = getNestedError(value)
  if (!candidate) {
    return undefined
  }

  const nestedError = getNestedError(candidate.error)

  return getString(candidate.code) ?? getString(nestedError?.code) ?? undefined
}

const getMessage = (value: unknown): string | undefined => {
  const candidate = getNestedError(value)
  if (!candidate) {
    return undefined
  }

  const nestedError = getNestedError(candidate.error)

  return getString(candidate.message) ?? getString(nestedError?.message) ?? undefined
}

const getStatus = (value: unknown): number | undefined => {
  const candidate = getNestedError(value)
  if (!candidate) {
    return undefined
  }

  const nestedError = getNestedError(candidate.error)

  return (
    (typeof candidate.status === 'number' ? candidate.status : undefined) ??
    (typeof nestedError?.status === 'number' ? nestedError.status : undefined) ??
    undefined
  )
}

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AuthRequestError'
  }
}

export function normalizeAuthRequestError(
  error: unknown,
  fallbackMessage: string,
): AuthRequestError {
  return new AuthRequestError(
    getMessage(error) ?? fallbackMessage,
    getCode(error) ?? 'unknown_error',
    getStatus(error) ?? 500,
  )
}

export function unwrapAuthResult<T>(
  result: { data?: T | null | undefined; error?: unknown },
  fallbackMessage: string,
): T {
  if (result.error) {
    throw normalizeAuthRequestError(result.error, fallbackMessage)
  }

  if (result.data == null) {
    throw new AuthRequestError(fallbackMessage, 'invalid_success_response', 500)
  }

  return result.data
}

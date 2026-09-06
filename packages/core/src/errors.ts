export type DomainErrorKind = 'conflict' | 'forbidden' | 'not_found' | 'unauthorized' | 'validation'

export type DomainError<
  TKind extends DomainErrorKind = DomainErrorKind,
  TCode extends string = string,
> = {
  code: TCode
  kind: TKind
  message: string
}

export const domainError = <TKind extends DomainErrorKind, TCode extends string>(
  kind: TKind,
  code: TCode,
  message: string,
): DomainError<TKind, TCode> => ({
  code,
  kind,
  message,
})

export const validationError = <TCode extends string>(
  code: TCode,
  message: string,
): DomainError<'validation', TCode> => domainError('validation', code, message)

export const conflictError = <TCode extends string>(
  code: TCode,
  message: string,
): DomainError<'conflict', TCode> => domainError('conflict', code, message)

export const notFoundError = <TCode extends string>(
  code: TCode,
  message: string,
): DomainError<'not_found', TCode> => domainError('not_found', code, message)

export const unauthorizedError = <TCode extends string>(
  code: TCode,
  message: string,
): DomainError<'unauthorized', TCode> => domainError('unauthorized', code, message)

export const forbiddenError = <TCode extends string>(
  code: TCode,
  message: string,
): DomainError<'forbidden', TCode> => domainError('forbidden', code, message)

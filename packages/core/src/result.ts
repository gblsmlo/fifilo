export type Ok<T> = {
  ok: true
  value: T
}

export type Err<E> = {
  ok: false
  error: E
}

export type Result<T, E> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })

export const err = <E>(error: E): Err<E> => ({ ok: false, error })

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok

export const map = <T, E, U>(result: Result<T, E>, mapper: (value: T) => U): Result<U, E> =>
  isOk(result) ? ok(mapper(result.value)) : result

export const mapError = <T, E, F>(result: Result<T, E>, mapper: (error: E) => F): Result<T, F> =>
  isOk(result) ? result : err(mapper(result.error))

export const flatMap = <T, E, U, F>(
  result: Result<T, E>,
  mapper: (value: T) => Result<U, F>,
): Result<U, E | F> => (isOk(result) ? mapper(result.value) : result)

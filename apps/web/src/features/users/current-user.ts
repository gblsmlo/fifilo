import { api, edenStatus } from '@libs/api-client'
import type { CurrentUserResponse } from '@twincam/core/contracts/users'

export class CurrentUserUnauthenticatedError extends Error {
  constructor() {
    super('A sessao atual nao esta autenticada')
    this.name = 'CurrentUserUnauthenticatedError'
  }
}

export class CurrentUserLoadError extends Error {
  constructor(
    readonly status?: number,
    cause?: unknown,
  ) {
    super('Nao foi possivel carregar o usuario atual', { cause })
    this.name = 'CurrentUserLoadError'
  }
}

export const fetchCurrentUser = async (): Promise<CurrentUserResponse> => {
  try {
    const { data, error } = await api.me.get()

    if (error) {
      if (edenStatus(error) === 401) {
        throw new CurrentUserUnauthenticatedError()
      }
      throw new CurrentUserLoadError(edenStatus(error))
    }

    return data
  } catch (cause) {
    if (cause instanceof CurrentUserUnauthenticatedError || cause instanceof CurrentUserLoadError) {
      throw cause
    }
    throw new CurrentUserLoadError(undefined, cause)
  }
}

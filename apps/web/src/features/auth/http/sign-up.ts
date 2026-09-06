import { api, edenCreated, edenStatus } from '@libs/api-client'
import {
  type SignUpRequest,
  type SignUpResponse,
  signUpErrorResponseSchema,
  signUpResponseSchema,
} from '@twincam/core/contracts/auth'

import { AuthRequestError } from './errors'

export async function signUp(payload: SignUpRequest): Promise<SignUpResponse> {
  const result = await api.auth['sign-up'].post(payload)
  const { data, error } = edenCreated<unknown>(result)

  if (error) {
    const errorResponse = signUpErrorResponseSchema.safeParse(error.value)
    const message = errorResponse.success
      ? errorResponse.data.error.message
      : 'Nao foi possivel criar a conta.'
    const code = errorResponse.success ? errorResponse.data.error.code : 'unknown_error'
    throw new AuthRequestError(message, code, edenStatus(error))
  }

  // The account may exist even when the body is unreadable, so the message
  // tells the person to sign in instead of retrying.
  const parsed = signUpResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new AuthRequestError(
      'A conta foi criada, mas nao foi possivel confirmar a resposta do servidor. Tente entrar com seu e-mail.',
      'invalid_success_response',
      result.status,
    )
  }

  return parsed.data
}

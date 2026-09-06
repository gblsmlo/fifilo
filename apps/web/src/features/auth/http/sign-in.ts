import { authClient } from '@twincam/auth/client'

import { unwrapAuthResult } from './errors'

interface SignInRequest {
  email: string
  password: string
}

type SignInActionResult = Awaited<ReturnType<typeof authClient.signIn.email>>

export type SignInResponse = NonNullable<SignInActionResult['data']>

export async function signIn(payload: SignInRequest): Promise<SignInResponse> {
  const result = await authClient.signIn.email({
    email: payload.email,
    password: payload.password,
    rememberMe: true,
  })

  return unwrapAuthResult(result, 'Nao foi possivel autenticar.')
}

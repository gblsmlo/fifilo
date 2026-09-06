import { authClient } from '@twincam/auth/client'

import { unwrapAuthResult } from './errors'

interface VerifyTotpRequest {
  code: string
}

type VerifyTotpResult = Awaited<ReturnType<typeof authClient.twoFactor.verifyTotp>>

export type VerifyTotpResponse = NonNullable<VerifyTotpResult['data']>

export async function verifyTotp(payload: VerifyTotpRequest): Promise<VerifyTotpResponse> {
  const result = await authClient.twoFactor.verifyTotp({
    code: payload.code,
  })

  return unwrapAuthResult(result, 'Codigo de autenticacao invalido.')
}

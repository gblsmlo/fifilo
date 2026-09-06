import { authClient } from '@twincam/auth/client'

import { unwrapAuthResult } from './errors'

interface ResetPasswordRequest {
  newPassword: string
  token: string
}

type ResetPasswordResult = Awaited<ReturnType<typeof authClient.resetPassword>>

export type ResetPasswordResponse = NonNullable<ResetPasswordResult['data']>

export async function resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const result = await authClient.resetPassword({
    newPassword: payload.newPassword,
    token: payload.token,
  })

  return unwrapAuthResult(result, 'Nao foi possivel redefinir a senha.')
}

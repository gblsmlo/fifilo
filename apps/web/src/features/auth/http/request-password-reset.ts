import { authClient } from '@twincam/auth/client'

import { unwrapAuthResult } from './errors'

interface RequestPasswordResetRequest {
  email: string
  redirectTo: string
}

type RequestPasswordResetResult = Awaited<ReturnType<typeof authClient.requestPasswordReset>>

export type RequestPasswordResetResponse = NonNullable<RequestPasswordResetResult['data']>

export async function requestPasswordReset(
  payload: RequestPasswordResetRequest,
): Promise<RequestPasswordResetResponse> {
  const result = await authClient.requestPasswordReset({
    email: payload.email,
    redirectTo: payload.redirectTo,
  })

  return unwrapAuthResult(result, 'Nao foi possivel enviar o link.')
}

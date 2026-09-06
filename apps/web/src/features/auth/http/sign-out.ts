import { authClient } from '@fifilo/auth/client'
import { unwrapAuthResult } from './errors'

export async function signOut(): Promise<void> {
  const result = await authClient.signOut()
  unwrapAuthResult(result, 'Não foi possível encerrar a sessão.')
}

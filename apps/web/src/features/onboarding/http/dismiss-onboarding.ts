import { api, edenCreated } from '@libs/api-client'

export async function dismissOnboarding(): Promise<void> {
  const result = edenCreated(await api.onboarding.dismiss.post())
  if (result.error) throw new Error('Não foi possível adiar a configuração financeira.')
}

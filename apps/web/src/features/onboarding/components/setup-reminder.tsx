import { Alert, AlertAction, AlertDescription, AlertTitle } from '@fifilo/ui/components/alert'
import { Button } from '@fifilo/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { SparklesIcon } from 'lucide-react'

import { onboardingStatusQueryOptions } from '../query-options'

export function SetupReminder() {
  const { data } = useQuery(onboardingStatusQueryOptions())
  if (!data?.reminderVisible) return null

  return (
    <Alert variant='info'>
      <SparklesIcon aria-hidden='true' />
      <AlertTitle>Finalize sua configuração financeira</AlertTitle>
      <AlertDescription>
        Adicione as configurações do workspace e sua primeira conta.
      </AlertDescription>
      <AlertAction>
        <Button render={<a href='/onboarding/setup'>Continuar</a>} size='sm' variant='outline' />
      </AlertAction>
    </Alert>
  )
}

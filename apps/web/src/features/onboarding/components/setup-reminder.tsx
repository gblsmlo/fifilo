import { Alert, AlertAction, AlertDescription, AlertTitle } from '@fifilo/ui/components/alert'
import { Button } from '@fifilo/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { SparklesIcon } from 'lucide-react'

import { onboardingStatusQueryOptions } from '../query-options'

export function SetupReminder() {
  const { data } = useQuery(onboardingStatusQueryOptions())
  if (!data?.reminderVisible) return null

  return (
    <Alert variant='info'>
      <SparklesIcon aria-hidden='true' />
      <AlertTitle>Falta pouco para o painel fazer sentido</AlertTitle>
      <AlertDescription>Confirme sua região e diga onde está seu dinheiro hoje.</AlertDescription>
      <AlertAction>
        <Button
          render={<Link to='/onboarding/setup'>Continuar</Link>}
          size='sm'
          variant='outline'
        />
      </AlertAction>
    </Alert>
  )
}

import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { useQuery } from '@tanstack/react-query'

import { onboardingStatusQueryOptions } from '../query-options'

export function SetupReminder() {
  const { data } = useQuery(onboardingStatusQueryOptions())
  if (!data?.reminderVisible) return null

  return (
    <Card className='border-primary/30 bg-primary/5'>
      <CardHeader>
        <CardTitle>Finalize sua configuração financeira</CardTitle>
      </CardHeader>
      <CardContent className='flex items-center justify-between gap-4'>
        <p className='text-muted-foreground text-sm'>
          Adicione as configurações do workspace e sua primeira conta.
        </p>
        <Button render={<a href='/onboarding/setup'>Continuar</a>} />
      </CardContent>
    </Card>
  )
}

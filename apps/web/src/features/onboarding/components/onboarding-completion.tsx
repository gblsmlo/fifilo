import { Button } from '@fifilo/ui/components/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@fifilo/ui/components/card'

export function OnboardingCompletion() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração concluída</CardTitle>
        <CardDescription>
          Seu workspace já está pronto para organizar sua vida financeira.
        </CardDescription>
      </CardHeader>
      <CardFooter className='flex flex-wrap gap-3'>
        <Button render={<a href='/dashboard'>Ir para o painel</a>} />
        <Button render={<a href='/organization'>Convidar alguém</a>} variant='outline' />
      </CardFooter>
    </Card>
  )
}

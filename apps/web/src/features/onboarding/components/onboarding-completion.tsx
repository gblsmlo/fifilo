import { accountBalancesQueryOptions } from '@features/accounts'
import { Button } from '@fifilo/ui/components/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@fifilo/ui/components/card'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

/**
 * The balance is the whole point of the screen: a setup that ends on
 * "concluído" has proved nothing, and one that ends on the person's own money
 * has. Invitation moved out — there is nothing to share yet.
 */
export function OnboardingCompletion() {
  const { data } = useQuery(accountBalancesQueryOptions())

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data ? `Seu saldo: ${formatMoney(data.consolidated)}` : 'Somando suas contas…'}
        </CardTitle>
        {/* The shell above already says the setup is done; this says what to
            do with it. */}
        <CardDescription>Registre um lançamento para o painel ganhar vida.</CardDescription>
      </CardHeader>
      <CardFooter className='flex flex-wrap gap-3'>
        <Button render={<Link to='/transactions'>Registrar um lançamento</Link>} />
        <Button render={<Link to='/dashboard'>Ir para o painel</Link>} variant='outline' />
      </CardFooter>
    </Card>
  )
}

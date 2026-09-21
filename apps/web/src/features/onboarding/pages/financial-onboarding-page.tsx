import { AccountForm } from '@features/accounts'
import { Button } from '@fifilo/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@fifilo/ui/components/card'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { OnboardingCompletion } from '../components/onboarding-completion'
import { WorkspaceSettingsSetup } from '../components/workspace-settings-setup'
import { dismissOnboarding } from '../http/dismiss-onboarding'
import { onboardingStatusQueryOptions } from '../query-options'

export function FinancialOnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery(onboardingStatusQueryOptions())

  if (isPending || !data) return null

  const skip = async () => {
    await dismissOnboarding()
    await queryClient.invalidateQueries({ queryKey: onboardingStatusQueryOptions().queryKey })
    await navigate({ to: '/dashboard' })
  }

  if (data.complete) {
    return <OnboardingCompletion />
  }

  if (!data.steps.workspaceSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirme sua região</CardTitle>
          <CardDescription>
            Como o Fifilo deve interpretar suas datas e seus valores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSettingsSetup
            onSaved={() =>
              void queryClient.refetchQueries({ queryKey: onboardingStatusQueryOptions().queryKey })
            }
          />
        </CardContent>
        <CardFooter>
          <Button onClick={skip} variant='ghost'>
            Faço isso depois
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onde está seu dinheiro hoje?</CardTitle>
        <CardDescription>
          Comece pela conta que você mais usa. Dá para adicionar outras depois.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AccountForm
          onCreated={() =>
            void queryClient.refetchQueries({ queryKey: onboardingStatusQueryOptions().queryKey })
          }
        />
      </CardContent>
      <CardFooter>
        <Button onClick={skip} variant='ghost'>
          Faço isso depois
        </Button>
      </CardFooter>
    </Card>
  )
}

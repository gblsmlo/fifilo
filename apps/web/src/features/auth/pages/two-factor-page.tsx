import { Link } from '@tanstack/react-router'

import { Page } from '../../../components/page'
import { TwoFactorForm } from '../components/forms/two-factor-form'

interface TwoFactorPageProps {
  redirectTo: string
}

export function TwoFactorPage({ redirectTo }: Readonly<TwoFactorPageProps>) {
  return (
    <Page>
      <Page.Header
        description='Informe o código do seu aplicativo autenticador para continuar.'
        title='Verificação em duas etapas'
      />
      <Page.Body>
        <TwoFactorForm redirectTo={redirectTo} />
      </Page.Body>
      <Page.Footer>
        <p className='text-muted-foreground text-sm'>
          Errou o fluxo? <Link to='/login'>Voltar ao login</Link>
        </p>
      </Page.Footer>
    </Page>
  )
}

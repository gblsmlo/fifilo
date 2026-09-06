import { Link } from '@tanstack/react-router'

import { Page } from '../../../components/page'
import { SignUpForm } from '../components/forms/sign-up-form'

export function SignUpPage({ redirectTo }: Readonly<{ redirectTo: string }>) {
  return (
    <Page>
      <Page.Header
        description='Crie sua conta para começar a usar a plataforma.'
        title='Criar conta'
      />
      <Page.Body>
        <SignUpForm redirectTo={redirectTo} />
      </Page.Body>
      <Page.Footer>
        <p className='text-muted-foreground text-sm'>
          Já tem uma conta? <Link to='/login'>Entrar</Link>
        </p>
      </Page.Footer>
    </Page>
  )
}

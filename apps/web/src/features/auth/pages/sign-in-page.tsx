import { Link } from '@tanstack/react-router'

import { Page } from '../../../components/page'
import { SignInForm } from '../components/forms/sign-in-form'

interface SignInPageProps {
  initialEmail?: string
  redirectTo: string
}

export function SignInPage({ initialEmail, redirectTo }: Readonly<SignInPageProps>) {
  return (
    <Page>
      <Page.Header description='Insira suas credenciais para acessar sua conta.' title='Entrar' />
      <Page.Body>
        <SignInForm initialEmail={initialEmail} redirectTo={redirectTo} />
      </Page.Body>
      <Page.Footer>
        <p className='text-muted-foreground text-sm'>
          Ainda não tem uma conta? <Link to='/sign-up'>Crie uma</Link>
        </p>
      </Page.Footer>
    </Page>
  )
}

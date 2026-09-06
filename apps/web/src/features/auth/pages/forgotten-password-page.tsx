import { Link } from '@tanstack/react-router'

import { Page } from '../../../components/page'
import { ForgottenPasswordForm } from '../components/forms/forgotten-password-form'

export function ForgottenPasswordPage({ initialEmail }: Readonly<{ initialEmail?: string }>) {
  return (
    <Page>
      <Page.Header
        description='Solicite um novo link de acesso quando não lembrar a senha ou quando o token anterior expirar.'
        title='Recupere o acesso'
      />
      <Page.Body>
        <ForgottenPasswordForm initialEmail={initialEmail} />
      </Page.Body>
      <Page.Footer>
        <p className='text-muted-foreground text-sm'>
          Lembrou a senha?{' '}
          <Link className='text-cyan-200 hover:text-cyan-100' to='/login'>
            Voltar ao login
          </Link>
        </p>
      </Page.Footer>
    </Page>
  )
}

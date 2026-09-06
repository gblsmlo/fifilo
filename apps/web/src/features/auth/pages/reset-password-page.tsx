import { Link } from '@tanstack/react-router'

import { Page } from '../../../components/page'
import { ResetPasswordForm } from '../components/forms/reset-password-form'

export function ResetPasswordPage({ token }: Readonly<{ token?: string }>) {
  if (!token) {
    return (
      <Page>
        <Page.Header
          description='O link de redefinição precisa incluir um token válido. Solicite um novo e-mail de recuperação.'
          title='Link inválido'
        />
        <Page.Body>
          <p className='text-muted-foreground text-sm leading-6'>
            Não encontramos um token de redefinição nesta página. Solicite um novo link para gerar
            uma nova sessão de recuperação.
          </p>
        </Page.Body>
        <Page.Footer>
          <p className='text-muted-foreground text-sm'>
            Precisa de outro link? <Link to='/forgotten-password'>Solicitar novamente</Link>
          </p>
        </Page.Footer>
      </Page>
    )
  }

  return (
    <Page>
      <Page.Header
        description='Escolha uma nova senha para encerrar o fluxo de recuperação e voltar ao login.'
        title='Defina a nova senha'
      />
      <Page.Body>
        <ResetPasswordForm token={token} />
      </Page.Body>
      <Page.Footer>
        <p className='text-muted-foreground text-sm'>
          Já concluiu? <Link to='/login'>Ir para o login</Link>
        </p>
      </Page.Footer>
    </Page>
  )
}

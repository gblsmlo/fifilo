export interface AuthFeedbackToast {
  description: string
  title: string
  type: 'error' | 'success'
}

const failure =
  (title: string) =>
  (description: string): AuthFeedbackToast => ({ description, title, type: 'error' })

/**
 * Os toasts de auth sao a unica evidencia que o usuario recebe do resultado da
 * submissao, e as stories precisam exibir exatamente o mesmo texto que os hooks
 * emitem. Manter os dois lados apontando para este modulo evita que a story
 * documente uma copia que ja mudou.
 */
export const authFeedback = {
  requestPasswordReset: {
    failure: failure('Falha ao enviar link'),
    success: {
      description: 'Se o e-mail existir, enviamos um link para redefinir a senha.',
      title: 'Link enviado',
      type: 'success',
    } satisfies AuthFeedbackToast,
  },
  resetPassword: {
    failure: failure('Falha ao redefinir senha'),
    success: {
      description: 'Sua senha foi atualizada. Entre com a nova credencial.',
      title: 'Senha atualizada',
      type: 'success',
    } satisfies AuthFeedbackToast,
  },
  signIn: {
    failure: failure('Falha ao entrar'),
    success: {
      description: 'Sessão iniciada com sucesso.',
      title: 'Bem-vindo de volta',
      type: 'success',
    } satisfies AuthFeedbackToast,
  },
  signUp: {
    failure: failure('Falha ao criar conta'),
    // A mensagem de sucesso do cadastro vem do servidor, nao do cliente.
    success: (description: string): AuthFeedbackToast => ({
      description,
      title: 'Conta criada',
      type: 'success',
    }),
  },
  twoFactor: {
    failure: failure('Falha na verificacao'),
    success: {
      description: 'Verificação em duas etapas concluída.',
      title: 'Acesso validado',
      type: 'success',
    } satisfies AuthFeedbackToast,
  },
} as const

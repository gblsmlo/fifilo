export interface AccountFeedbackToast {
  description: string
  title: string
  type: 'error' | 'success'
}

const failure =
  (title: string) =>
  (description: string): AccountFeedbackToast => ({ description, title, type: 'error' })

export const accountFeedback = {
  archive: {
    failure: failure('Falha ao arquivar conta'),
    success: {
      description: 'A conta foi arquivada e não recebe mais lançamentos.',
      title: 'Conta arquivada',
      type: 'success',
    } satisfies AccountFeedbackToast,
  },
  create: {
    failure: failure('Falha ao criar conta'),
    success: {
      description: 'A conta já aparece na lista, pronta para receber lançamentos.',
      title: 'Conta criada',
      type: 'success',
    } satisfies AccountFeedbackToast,
  },
  update: {
    failure: failure('Falha ao editar conta'),
    success: {
      description: 'As alterações foram salvas.',
      title: 'Conta atualizada',
      type: 'success',
    } satisfies AccountFeedbackToast,
  },
} as const

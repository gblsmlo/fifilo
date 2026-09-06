export interface TransactionFeedbackToast {
  description: string
  title: string
  type: 'error' | 'success'
}

const failure =
  (title: string) =>
  (description: string): TransactionFeedbackToast => ({ description, title, type: 'error' })

export const transactionFeedback = {
  create: {
    failure: failure('Falha ao registrar transação'),
    success: {
      description: 'A transação já aparece na lista.',
      title: 'Transação registrada',
      type: 'success',
    } satisfies TransactionFeedbackToast,
  },
  delete: {
    failure: failure('Falha ao excluir transação'),
    success: {
      description: 'A transação e suas pernas foram removidas.',
      title: 'Transação excluída',
      type: 'success',
    } satisfies TransactionFeedbackToast,
  },
  update: {
    failure: failure('Falha ao editar transação'),
    success: {
      description: 'As alterações foram salvas.',
      title: 'Transação atualizada',
      type: 'success',
    } satisfies TransactionFeedbackToast,
  },
} as const

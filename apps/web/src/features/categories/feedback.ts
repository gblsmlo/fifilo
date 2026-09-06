export interface CategoryFeedbackToast {
  description: string
  title: string
  type: 'error' | 'success'
}

const failure =
  (title: string) =>
  (description: string): CategoryFeedbackToast => ({ description, title, type: 'error' })

export const categoryFeedback = {
  create: {
    failure: failure('Falha ao criar categoria'),
    success: {
      description: 'A categoria já aparece na lista, pronta para uso.',
      title: 'Categoria criada',
      type: 'success',
    } satisfies CategoryFeedbackToast,
  },
  reassign: {
    failure: failure('Falha ao reatribuir categoria'),
    success: {
      description: 'As transações foram movidas e a categoria foi arquivada.',
      title: 'Categoria arquivada',
      type: 'success',
    } satisfies CategoryFeedbackToast,
  },
  update: {
    failure: failure('Falha ao editar categoria'),
    success: {
      description: 'As alterações foram salvas.',
      title: 'Categoria atualizada',
      type: 'success',
    } satisfies CategoryFeedbackToast,
  },
} as const

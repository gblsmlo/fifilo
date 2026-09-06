export interface CreditCardFeedbackToast {
  description: string
  title: string
  type: 'error' | 'success'
}

const failure =
  (title: string) =>
  (description: string): CreditCardFeedbackToast => ({ description, title, type: 'error' })

export const creditCardFeedback = {
  attach: {
    failure: failure('Falha ao cadastrar cartão'),
    success: {
      description: 'O cartão está pronto para receber compras.',
      title: 'Cartão cadastrado',
      type: 'success',
    } satisfies CreditCardFeedbackToast,
  },
  closeInvoice: {
    failure: failure('Falha ao fechar fatura'),
    success: {
      description: 'A fatura está fechada e pronta para pagamento.',
      title: 'Fatura fechada',
      type: 'success',
    } satisfies CreditCardFeedbackToast,
  },
  installmentPurchase: {
    failure: failure('Falha ao registrar compra'),
    success: {
      description: 'As parcelas foram lançadas nas faturas seguintes.',
      title: 'Compra registrada',
      type: 'success',
    } satisfies CreditCardFeedbackToast,
  },
  payInvoice: {
    failure: failure('Falha ao pagar fatura'),
    success: {
      description: 'O pagamento foi transferido da conta de origem.',
      title: 'Fatura paga',
      type: 'success',
    } satisfies CreditCardFeedbackToast,
  },
} as const

import { api } from '@libs/api-client'

import { normalizeTransactionRequestError } from './errors'

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await api.transactions({ id }).delete()

  if (error) {
    throw normalizeTransactionRequestError(error.value, 'Não foi possível excluir a transação.')
  }
}

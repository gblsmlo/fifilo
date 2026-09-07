import { api } from '@libs/api-client'

import { normalizeSettingsRequestError } from './errors'

export interface ExportTransactionsQuery {
  from: string
  to: string
}

/**
 * The server sets `content-type: text/csv` (Decision 029), so Eden hands
 * back the body as text instead of attempting a JSON parse - `data` here is
 * the CSV itself, not a wrapper around it.
 */
export async function exportTransactionsCsv(query: ExportTransactionsQuery): Promise<string> {
  const { data, error } = await api.export.transactions.get({ query })

  if (error) {
    throw normalizeSettingsRequestError(error.value, 'Não foi possível exportar os dados.')
  }

  return data
}

/**
 * A CSV a person downloads and opens in a spreadsheet app, not content this
 * app renders - triggering a real file save is the one legitimate use of the
 * browser's own download mechanism this feature needs.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

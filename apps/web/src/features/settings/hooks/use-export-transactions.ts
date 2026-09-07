import { toastManager } from '@fifilo/ui/components/toast'
import { useMutation } from '@tanstack/react-query'

import { settingsFeedback } from '../feedback'
import { SettingsRequestError } from '../http/errors'
import { downloadCsv, exportTransactionsCsv } from '../http/export-transactions'

export function useExportTransactions() {
  return useMutation({
    mutationFn: async (query: { from: string; to: string }) => {
      const csv = await exportTransactionsCsv(query)
      downloadCsv(csv, `fifilo-${query.from}-a-${query.to}.csv`)
    },
    onError: (error) => {
      const message =
        error instanceof SettingsRequestError
          ? error.message
          : 'Não foi possível exportar os dados.'
      toastManager.add(settingsFeedback.export.failure(message))
    },
    onSuccess: () => {
      toastManager.add(settingsFeedback.export.success)
    },
  })
}

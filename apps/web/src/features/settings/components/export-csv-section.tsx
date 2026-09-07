import { SettingsRow, SettingsSection } from '@fifilo/patterns/settings'
import { Button } from '@fifilo/ui/components/button'
import { Input } from '@fifilo/ui/components/input'
import { useState } from 'react'

import { useExportTransactions } from '../hooks/use-export-transactions'

/**
 * Owner and admin only (Fase 06 § Modelagem, Decision 029) - the caller
 * decides whether to render this section at all; a viewer or member who
 * still reaches the API gets the same 403 every other settings write
 * answers, this just never shows the button in the first place.
 */
export function ExportCsvSection() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const exportTransactions = useExportTransactions()

  return (
    <SettingsSection title='Exportação'>
      <SettingsRow
        description='CSV de transações, lançamentos, contas, categorias e faturas do período'
        title='Exportar dados'
      >
        <div className='flex items-center gap-2'>
          <Input
            aria-label='De'
            onChange={(event) => setFrom(event.target.value)}
            type='date'
            value={from}
          />
          <Input
            aria-label='Até'
            onChange={(event) => setTo(event.target.value)}
            type='date'
            value={to}
          />
          <Button
            disabled={!from || !to}
            loading={exportTransactions.isPending}
            onClick={() => exportTransactions.mutate({ from, to })}
            type='button'
          >
            Exportar CSV
          </Button>
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}

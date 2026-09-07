import type { WorkspaceSettingsResponse } from '@fifilo/core/settings'
import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { settingsFeedback } from '../feedback'
import { SettingsRequestError } from '../http/errors'
import { updateWorkspaceSettings } from '../http/update-workspace-settings'
import { workspaceSettingsQueryOptions } from '../query-options'
import {
  type WorkspaceSettingsFormInput,
  type WorkspaceSettingsFormValues,
  workspaceSettingsFormSchema,
} from '../schemas/workspace-settings-form'

export type {
  WorkspaceSettingsFormInput,
  WorkspaceSettingsFormValues,
} from '../schemas/workspace-settings-form'

const toFormValues = (settings: WorkspaceSettingsResponse): WorkspaceSettingsFormValues => ({
  currency: settings.currency,
  locale: settings.locale,
  monthStartDay: settings.monthStartDay,
  timezone: settings.timezone,
  version: settings.version,
  weekStartsOn: settings.weekStartsOn,
})

/**
 * `values` (not `defaultValues`) keeps the form synced to the query's own
 * cache: a `version_conflict` response refetches and re-seeds the form with
 * the row that actually won, rather than leaving the user's stale `version`
 * in place to fail again on retry.
 */
export function useWorkspaceSettingsForm() {
  const queryClient = useQueryClient()
  const query = useQuery(workspaceSettingsQueryOptions())

  const form = useForm<WorkspaceSettingsFormInput, unknown, WorkspaceSettingsFormValues>({
    resolver: zodResolver(workspaceSettingsFormSchema),
    values: query.data ? toFormValues(query.data) : undefined,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateWorkspaceSettings(values)
      queryClient.setQueryData(workspaceSettingsQueryOptions().queryKey, updated)
      toastManager.add(settingsFeedback.workspace.success)
    } catch (error) {
      if (error instanceof SettingsRequestError && error.code === 'version_conflict') {
        await query.refetch()
        toastManager.add(
          settingsFeedback.workspace.failure(
            'As configurações mudaram desde que a página carregou. Os valores foram atualizados - revise e salve novamente.',
          ),
        )
        return
      }

      if (error instanceof SettingsRequestError && error.code === 'currency_locked') {
        form.setError('currency', { message: error.message, type: 'server' })
        return
      }

      const message =
        error instanceof SettingsRequestError
          ? error.message
          : 'Não foi possível salvar as configurações.'
      toastManager.add(settingsFeedback.workspace.failure(message))
    }
  })

  return { form, onSubmit, query }
}

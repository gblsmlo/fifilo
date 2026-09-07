import type { UserPreferencesResponse } from '@fifilo/core/settings'
import { toastManager } from '@fifilo/ui/components/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { settingsFeedback } from '../feedback'
import { SettingsRequestError } from '../http/errors'
import { updateUserPreferences } from '../http/update-user-preferences'
import { userPreferencesQueryOptions } from '../query-options'
import {
  type UserPreferencesFormInput,
  type UserPreferencesFormValues,
  userPreferencesFormSchema,
} from '../schemas/user-preferences-form'

export type {
  UserPreferencesFormInput,
  UserPreferencesFormValues,
} from '../schemas/user-preferences-form'

const toFormValues = (preferences: UserPreferencesResponse): UserPreferencesFormValues => ({
  density: preferences.density,
  notifyByEmail: preferences.notifyByEmail,
  theme: preferences.theme,
  version: preferences.version,
})

export function useUserPreferencesForm() {
  const queryClient = useQueryClient()
  const query = useQuery(userPreferencesQueryOptions())

  const form = useForm<UserPreferencesFormInput, unknown, UserPreferencesFormValues>({
    resolver: zodResolver(userPreferencesFormSchema),
    values: query.data ? toFormValues(query.data) : undefined,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateUserPreferences(values)
      queryClient.setQueryData(userPreferencesQueryOptions().queryKey, updated)
      toastManager.add(settingsFeedback.preferences.success)
    } catch (error) {
      if (error instanceof SettingsRequestError && error.code === 'version_conflict') {
        await query.refetch()
        toastManager.add(
          settingsFeedback.preferences.failure(
            'Suas preferências mudaram desde que a página carregou. Os valores foram atualizados - revise e salve novamente.',
          ),
        )
        return
      }

      const message =
        error instanceof SettingsRequestError
          ? error.message
          : 'Não foi possível salvar suas preferências.'
      toastManager.add(settingsFeedback.preferences.failure(message))
    }
  })

  return { form, onSubmit, query }
}

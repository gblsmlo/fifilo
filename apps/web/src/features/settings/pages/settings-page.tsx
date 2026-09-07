import { toWorkspaceRole } from '@fifilo/core/access-control'
import { Spinner } from '@fifilo/ui/components/spinner'
import { FormProvider } from 'react-hook-form'

import { ExportCsvSection } from '../components/export-csv-section'
import { UserPreferencesForm } from '../components/user-preferences-form'
import { WorkspaceSettingsForm } from '../components/workspace-settings-form'
import { useUserPreferencesForm } from '../hooks/use-user-preferences-form'
import { useWorkspaceSettingsForm } from '../hooks/use-workspace-settings-form'

interface SettingsPageProps {
  role: string
}

/**
 * `role` decides only what renders as editable, never what the API accepts
 * (Decision 026: authorization is decided in the use case) - a member who
 * forges a PATCH still gets the same 403 `requireSettingsWriteAccess`
 * answers every other caller.
 */
export function SettingsPage({ role }: Readonly<SettingsPageProps>) {
  const workspace = useWorkspaceSettingsForm()
  const preferences = useUserPreferencesForm()
  const workspaceRole = toWorkspaceRole(role)
  const canEdit = workspaceRole === 'owner' || workspaceRole === 'admin'

  return (
    <section className='mx-auto flex w-full max-w-3xl flex-col gap-8 p-6'>
      <div className='space-y-2'>
        <h1 className='font-semibold text-3xl tracking-tight'>Configurações</h1>
        <p className='text-muted-foreground'>
          Moeda, fuso e preferências do workspace, e as suas próprias preferências de conta.
        </p>
      </div>

      {workspace.query.isPending ? (
        <div className='flex justify-center py-12'>
          <Spinner aria-label='Carregando configurações' />
        </div>
      ) : (
        <FormProvider {...workspace.form}>
          <WorkspaceSettingsForm
            canEdit={canEdit}
            isSubmitting={workspace.form.formState.isSubmitting}
            onSubmit={workspace.onSubmit}
          />
        </FormProvider>
      )}

      {preferences.query.isPending ? (
        <div className='flex justify-center py-12'>
          <Spinner aria-label='Carregando preferências' />
        </div>
      ) : (
        <FormProvider {...preferences.form}>
          <UserPreferencesForm
            isSubmitting={preferences.form.formState.isSubmitting}
            onSubmit={preferences.onSubmit}
          />
        </FormProvider>
      )}

      {canEdit ? <ExportCsvSection /> : null}
    </section>
  )
}

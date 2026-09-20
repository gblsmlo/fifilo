import { toWorkspaceRole } from '@fifilo/core/access-control'
import { StateGuard } from '@fifilo/patterns/state-surface'
import { Page } from '@web/components/page'
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
    <Page className='gap-8' width='md'>
      <Page.Header
        align='start'
        description='Moeda, fuso e preferências do workspace, e as suas próprias preferências de conta.'
        title='Configurações'
      />

      <StateGuard
        state={workspace.query.isPending ? 'loading' : 'data'}
        surface={{
          description: 'Buscando moeda, fuso e início do mês do workspace.',
          title: 'Carregando configurações',
        }}
      >
        <FormProvider {...workspace.form}>
          <WorkspaceSettingsForm
            canEdit={canEdit}
            isSubmitting={workspace.form.formState.isSubmitting}
            onSubmit={workspace.onSubmit}
          />
        </FormProvider>
      </StateGuard>

      <StateGuard
        state={preferences.query.isPending ? 'loading' : 'data'}
        surface={{
          description: 'Buscando tema, densidade e notificações.',
          title: 'Carregando preferências',
        }}
      >
        <FormProvider {...preferences.form}>
          <UserPreferencesForm
            isSubmitting={preferences.form.formState.isSubmitting}
            onSubmit={preferences.onSubmit}
          />
        </FormProvider>
      </StateGuard>

      {canEdit ? <ExportCsvSection /> : null}
    </Page>
  )
}

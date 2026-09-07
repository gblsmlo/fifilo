export interface SettingsFeedbackToast {
  description: string
  title: string
  type: 'error' | 'success'
}

const failure =
  (title: string) =>
  (description: string): SettingsFeedbackToast => ({ description, title, type: 'error' })

export const settingsFeedback = {
  export: {
    failure: failure('Falha ao exportar'),
    success: {
      description: 'O arquivo CSV foi baixado.',
      title: 'Exportação concluída',
      type: 'success',
    } satisfies SettingsFeedbackToast,
  },
  preferences: {
    failure: failure('Falha ao salvar preferências'),
    success: {
      description: 'Suas preferências foram atualizadas.',
      title: 'Preferências salvas',
      type: 'success',
    } satisfies SettingsFeedbackToast,
  },
  workspace: {
    failure: failure('Falha ao salvar configurações'),
    success: {
      description: 'As configurações do workspace foram atualizadas.',
      title: 'Configurações salvas',
      type: 'success',
    } satisfies SettingsFeedbackToast,
  },
} as const

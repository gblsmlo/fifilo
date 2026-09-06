import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsRow, SettingsSection } from '@twincam/patterns/settings'
import { Button } from '@twincam/ui/components/button'
import { Switch } from '@twincam/ui/components/switch'
import { expect } from 'storybook/test'

const meta = {
  component: SettingsRow,
  decorators: [
    (Story) => (
      <div className='w-144 p-4'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A fileira de uma superfície de configurações: `title` e `description` à esquerda, o que o consumidor renderizar à direita. A moldura não conhece o que a direita carrega — não há prop de valor nem de controle —, então select, switch, texto somente leitura e campo com auto-save entram pelo mesmo slot. Dividir e empilhar é da `SettingsSection`.',
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Settings/Row',
} satisfies Meta<typeof SettingsRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    description: 'Ajusta o tamanho do texto no app inteiro',
    title: 'Tamanho da fonte',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="settings-row-title"]')).toHaveTextContent(
      'Tamanho da fonte',
    )
    await expect(canvasElement.querySelector('[data-slot="settings-row-trailing"]')).not.toBeNull()
  },
  render: (args) => (
    <SettingsSection>
      <SettingsRow {...args}>
        <Button size='sm' variant='secondary'>
          Padrão
        </Button>
      </SettingsRow>
    </SettingsSection>
  ),
}

export const ReadOnly: Story = {
  args: {
    description: 'A sua credencial de acesso; ainda não pode ser alterado',
    title: 'E-mail',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A direita é texto somente leitura: a mesma fileira serve ao que a pessoa muda e ao que só consulta.',
      },
    },
  },
  render: (args) => (
    <SettingsSection>
      <SettingsRow {...args}>
        <span className='text-muted-foreground text-sm'>ana@empresa.com</span>
      </SettingsRow>
    </SettingsSection>
  ),
}

export const TitleOnly: Story = {
  args: { title: 'Sem controle ainda' },
  parameters: {
    docs: {
      description: {
        story:
          'Sem `description` e sem filho, só o título é desenhado: a fileira não reserva espaço para o que não existe.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="settings-row-description"]')).toBeNull()
    await expect(canvasElement.querySelector('[data-slot="settings-row-trailing"]')).toBeNull()
  },
  render: (args) => (
    <SettingsSection>
      <SettingsRow {...args} />
    </SettingsSection>
  ),
}

export const Stacked: Story = {
  args: { title: 'Sublinhar links' },
  parameters: {
    docs: {
      description: {
        story:
          'Várias fileiras dentro de uma `SettingsSection` com título: o card divide as linhas, e cada direita é uma composição diferente do consumidor.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="settings-row"]')).toHaveLength(2)
  },
  render: (args) => (
    <SettingsSection title='Interface e tema'>
      <SettingsRow description='Sempre sublinha o título das listas' {...args}>
        <Switch aria-label='Sublinhar links' defaultChecked />
      </SettingsRow>
      <SettingsRow description='Escolha o esquema de cores da interface' title='Tema da interface'>
        <Button size='sm' variant='secondary'>
          Escuro
        </Button>
      </SettingsRow>
    </SettingsSection>
  ),
}

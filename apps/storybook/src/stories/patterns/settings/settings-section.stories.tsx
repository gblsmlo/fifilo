import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsRow, SettingsSection } from '@twincam/patterns/settings'
import { Button } from '@twincam/ui/components/button'
import { expect } from 'storybook/test'

const meta = {
  component: SettingsSection,
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
          'O card de configurações: as `SettingsRow` divididas dentro de uma moldura. Com `title` vira uma `section` nomeada com o heading acima do card; sem ele é só o card, para a página cujo título já nomeia o card único.',
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Settings',
} satisfies Meta<typeof SettingsSection>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { title: 'Geral' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('section[aria-label="Geral"]')).not.toBeNull()
    await expect(canvasElement.querySelector('h2')).toHaveTextContent('Geral')
  },
  render: (args) => (
    <SettingsSection {...args}>
      <SettingsRow
        description='Como os nomes das pessoas aparecem na interface'
        title='Nomes de exibição'
      >
        <Button size='sm' variant='secondary'>
          Nome completo
        </Button>
      </SettingsRow>
      <SettingsRow description='Ajusta o tamanho do texto no app inteiro' title='Tamanho da fonte'>
        <Button size='sm' variant='secondary'>
          Padrão
        </Button>
      </SettingsRow>
    </SettingsSection>
  ),
}

export const Untitled: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Sem `title`, nem heading nem landmark: o card único de uma página já é nomeado pelo título dela.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('section')).toBeNull()
    await expect(canvasElement.querySelector('h2')).toBeNull()
  },
  render: (args) => (
    <SettingsSection {...args}>
      <SettingsRow description='O endereço do escritório; todo o app vive nele' title='URL'>
        <span className='text-muted-foreground text-sm'>/acme</span>
      </SettingsRow>
    </SettingsSection>
  ),
}

import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordStrength } from '@twincam/patterns/password-strength'
import { expect, within } from 'storybook/test'

const requirements = [
  { label: '12 caracteres', met: false },
  { label: 'Letras', met: false },
  { label: 'Números', met: false },
  { label: 'Símbolo', met: false },
]

const meta = {
  args: {
    ariaLabel: 'Força da senha',
    requirements,
  },
  component: PasswordStrength,
  parameters: {
    docs: {
      description: {
        component:
          'Barra de progresso mais a lista do que ja foi atendido. O pattern nao conhece politica de senha: quem consome decide quais linhas existem e quando cada uma esta atendida.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'PasswordStrength',
} satisfies Meta<typeof PasswordStrength>

export default meta

type Story = StoryObj<typeof meta>

function withMet(count: number) {
  return requirements.map((requirement, index) => ({ ...requirement, met: index < count }))
}

export const Empty: Story = {
  parameters: {
    docs: { description: { story: 'Nada digitado: a barra fica vazia e toda linha e pendente.' } },
  },
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('progressbar', { name: 'Força da senha' })

    await expect(meter.getAttribute('aria-valuenow')).toBe('0')
  },
}

export const Partial: Story = {
  args: { requirements: withMet(2) },
  parameters: {
    docs: {
      description: {
        story: 'Metade atendida. A barra e a leitura rapida; a lista diz exatamente o que falta.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('progressbar', { name: 'Força da senha' })

    await expect(meter.getAttribute('aria-valuenow')).toBe('2')
  },
}

export const Complete: Story = {
  args: { requirements: withMet(requirements.length) },
  parameters: {
    docs: { description: { story: 'Tudo atendido: a barra completa e nenhuma linha pendente.' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const meter = canvas.getByRole('progressbar', { name: 'Força da senha' })

    await expect(meter.getAttribute('aria-valuenow')).toBe('4')
    await expect(canvas.queryByText('pendente')).toBeNull()
  },
}

export const SingleRequirement: Story = {
  args: { requirements: [{ label: '12 caracteres', met: true }] },
  parameters: {
    docs: {
      description: {
        story: 'Uma linha so: a barra ainda funciona, sem divisao por zero quando a lista e curta.',
      },
    },
  },
}

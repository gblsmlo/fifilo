import { Stat, StatGroup } from '@fifilo/patterns/stat'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { booleanArgType } from '../../../test-utils/story-arg-types'

const meta = {
  args: {
    label: 'Disponível em caixa',
    value: 'R$ 4.250,00',
  },
  argTypes: {
    loading: booleanArgType,
    tone: { control: 'select', options: ['default', 'positive', 'negative'] },
  },
  component: Stat,
  decorators: [
    (Story) => (
      <div className='w-full max-w-3xl p-6'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Um número-chave num cartão Coss: rótulo, valor e uma dica opcional. A vitrine formata o valor e escolhe o tom; o shell só sabe que um número está em destaque. `StatGroup` alinha vários numa grade.',
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Stat',
} satisfies Meta<typeof Stat>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { hint: 'Até 30 de setembro' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="stat-value"]')).toHaveTextContent(
      'R$ 4.250,00',
    )
    await expect(canvasElement.querySelector('[data-slot="stat-hint"]')).toHaveTextContent(
      'Até 30 de setembro',
    )
  },
}

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    await expect(canvasElement.querySelector('[data-slot="stat-value"]')).toBeNull()
  },
}

export const Group: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="stat"]')).toHaveLength(3)
    await expect(canvasElement.querySelector('[data-tone="negative"]')).not.toBeNull()
  },
  render: () => (
    <StatGroup columns={3}>
      <Stat label='Disponível em caixa' value='R$ 4.250,00' />
      <Stat label='Comprometido em fatura' tone='negative' value='R$ 1.180,00' />
      <Stat label='Líquido' tone='positive' value='R$ 3.070,00' />
    </StatGroup>
  ),
}

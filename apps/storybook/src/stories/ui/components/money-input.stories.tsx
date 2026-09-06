import { MoneyInput } from '@fifilo/ui/components/money-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'

function MoneyInputFrame({ initialValueMinor = 0 }: { initialValueMinor?: number }) {
  const [valueMinor, setValueMinor] = useState(initialValueMinor)

  return (
    <div className='w-64'>
      <MoneyInput aria-label='Valor' onValueMinorChange={setValueMinor} valueMinor={valueMinor} />
    </div>
  )
}

const meta = {
  args: {
    'aria-label': 'Valor',
    onValueMinorChange: () => undefined,
    valueMinor: 0,
  },
  component: MoneyInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Edita o inteiro em centavos diretamente: cada tecla acrescenta um dígito e a exibição é derivada dele - nunca um `parseFloat` do texto (Decision 017).',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Foundation/MoneyInput',
} satisfies Meta<typeof MoneyInput>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = await within(canvasElement).findByRole('textbox')
    expect(input).toHaveProperty('value', '0,00')
  },
  render: () => <MoneyInputFrame />,
}

export const TypingAppendsDigits: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Digitar "500" produz R$ 5,00, não interpreta o texto como um valor decimal.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const input = await within(canvasElement).findByRole('textbox')

    await userEvent.type(input, '500')

    expect(input).toHaveProperty('value', '5,00')
  },
  render: () => <MoneyInputFrame />,
}

export const StartsWithAValue: Story = {
  render: () => <MoneyInputFrame initialValueMinor={123_45} />,
}

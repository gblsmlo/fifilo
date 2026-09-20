import { type DateRange, DateRangeProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expectBadgeSurface, expectPlainSurface } from '../../../../test-utils/property-surface'
import { booleanArgType, propertyArgTypes } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: {
    ...propertyArgTypes,
    allowClear: booleanArgType,
  },
  component: DateRangeProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Unidade de propriedade para um período — vigência de campanha, janela de atendimento, intervalo de apuração. É uma propriedade só, e não duas datas lado a lado: início sem fim e fim sem início são estados da mesma coisa. Quando editável, a superfície abre um Popover com Calendar em `mode="range"`.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/DateRange',
} satisfies Meta<typeof DateRangeProperty>

export default meta

type Story = StoryObj<typeof DateRangeProperty>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
  args: {
    locale: 'en-US',

    value: { from: new Date('2026-06-19T12:00:00.000Z'), to: new Date('2026-06-26T12:00:00.000Z') },
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
  args: {
    locale: 'en-US',

    value: { from: new Date('2026-06-19T12:00:00.000Z'), to: new Date('2026-06-26T12:00:00.000Z') },
    variant: 'plain',
  },
}

export const OpenEnded: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Uma ponta só: o rótulo diz qual delas existe em vez de mostrar metade de um intervalo. É o estado de uma campanha que começou sem data de encerramento definida.',
      },
    },
  },
  args: {
    locale: 'en-US',

    value: { from: new Date('2026-06-19T12:00:00.000Z'), to: undefined },
  },
}

export const Empty: Story = {
  args: {
    fallback: 'Sem período',
    value: undefined,
  },
}

export const Trigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Caso de uso editável: a superfície vira trigger e abre dois meses lado a lado. O primeiro clique já devolve `from` e `to` no mesmo dia; é o segundo que abre a faixa, então o popover fica aberto até o usuário fechá-lo.',
      },
    },
  },
  render: () => <DateRangePropertyPickerStory />,
}

function DateRangePropertyPickerStory() {
  const [value, setValue] = useState<DateRange | undefined>({
    from: new Date('2026-06-19T12:00:00.000Z'),
    to: new Date('2026-06-26T12:00:00.000Z'),
  })

  return (
    <div className='flex min-h-136 items-start p-16'>
      <DateRangeProperty
        ariaLabel='Período'
        fallback='Sem período'
        locale='en-US'
        value={value}
        onValueChange={setValue}
      />
    </div>
  )
}

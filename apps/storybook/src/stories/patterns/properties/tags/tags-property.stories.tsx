import { TagsProperty, type TagsPropertyOption } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'
import { expectAbsenceTone } from '../../../../test-utils/property-surface'
import { booleanArgType, propertyArgTypes } from '../../../../test-utils/story-arg-types'

type ExampleTag = string

const initialOptions: TagsPropertyOption<ExampleTag>[] = [
  { label: 'Documentos', value: 'documents' },
  { label: 'Retorno', value: 'return' },
  { label: 'Urgente', value: 'urgent' },
]

const meta = {
  argTypes: {
    ...propertyArgTypes,
    display: { control: 'inline-radio', options: ['chips', 'count'] },
    isLoading: booleanArgType,
  },
  component: TagsProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Coleção de tags com dois casos de uso, escolhidos por `display`. Em `chips` cada tag escolhida entra na row como badge secondary e o gatilho de ação fica ao lado delas, como último elemento, deixando os chips quebrarem para novas linhas. Em `count` a row não tem largura para os valores: o gatilho é o próprio feedback e acumula quantas tags o multi-select guarda. O popover é o mesmo nos dois e mantém largura própria, sem acompanhar a row.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Properties/Tags',
} satisfies Meta<typeof TagsProperty>

export default meta

type Story = StoryObj<typeof TagsProperty>

/**
 * Caso 1: a tag escolhida entra na row e o trigger de ação fica ao lado dela.
 */
export const Chips: Story = {
  play: async ({ canvas }) => {
    // The add-tag trigger is a 24px square — the same floor as the badge scale.
    const trigger = await canvas.findByRole('button', { name: 'Adicionar tag' })
    const measured = trigger.getBoundingClientRect()

    await expect(measured.width).toBe(24)
    await expect(measured.height).toBe(24)
  },
  parameters: {
    docs: {
      description: {
        story:
          'Superfície usada em SummaryProperty: preserva toda a interação sem introduzir um segundo campo visual dentro da linha.',
      },
    },
  },
  render: () => <TagsPropertyExample />,
}

export const ChipsEmpty: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Sem nenhuma tag na row o gatilho se explica, e vira um chip rotulado.',
      },
    },
  },
  render: () => <TagsPropertyExample initialValue={[]} />,
}

/**
 * Caso 2: numa linha de coleção a largura pertence às outras propriedades, então
 * os valores somem e o trigger vira o feedback do multi-select — um badge com a
 * quantidade acumulada, e o mesmo popover atrás.
 */
export const Count: Story = {
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'Tags' })

    // The counter is a badge, not just any button: a filled surface and the 24px
    // height the chips of the other use case also have.
    await expect(getComputedStyle(trigger).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    await expect(trigger.getBoundingClientRect().height).toBe(24)

    await userEvent.click(trigger)
    const positioner = await waitFor(() => {
      const opened = document.querySelector<HTMLElement>('[data-slot="combobox-positioner"]')

      if (!opened) throw new Error('o multi-select não abriu')

      return opened
    })

    // The popup anchor is `ComboboxChips`, which this use case does not mount:
    // without pointing it at the trigger, the multi-select opens invisible in the
    // viewport corner.
    await waitFor(async () => {
      await expect(getComputedStyle(positioner).getPropertyValue('--anchor-width')).toBe(
        `${Math.round(trigger.getBoundingClientRect().width)}px`,
      )
    })
    await expect(positioner.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      trigger.getBoundingClientRect().bottom,
    )
  },
  render: () => <TagsPropertyExample display='count' variant='badge' />,
}

export const CountEmpty: Story = {
  render: () => <TagsPropertyExample display='count' initialValue={[]} variant='badge' />,
}

export const CountPlural: Story = {
  render: () => (
    <TagsPropertyExample display='count' initialValue={['documents', 'urgent']} variant='badge' />
  ),
}

export const ReadOnly: Story = {
  args: {
    options: initialOptions,
    readOnly: true,
    value: ['documents', 'urgent'],
    variant: 'plain',
  },
}

export const ReadOnlyVazio: Story = {
  args: {
    options: initialOptions,
    placeholder: 'Sem tags',
    readOnly: true,
    value: [],
    variant: 'plain',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sem tags escolhidas o `placeholder` ocupa a row em tom secundário e emite `data-empty="true"`, o mesmo contrato de ausência das demais properties.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expectAbsenceTone(canvasElement)
  },
}

function TagsPropertyExample({
  display,
  initialValue = ['documents'],
  variant = 'plain',
}: Readonly<{
  display?: 'chips' | 'count'
  initialValue?: readonly string[]
  variant?: 'badge' | 'plain'
}>) {
  const [value, setValue] = useState<readonly string[]>(initialValue)

  return (
    <div className='max-w-sm p-4'>
      <TagsProperty
        ariaLabel='Tags'
        display={display}
        onValueChange={setValue}
        options={initialOptions}
        value={value}
        variant={variant}
      />
    </div>
  )
}

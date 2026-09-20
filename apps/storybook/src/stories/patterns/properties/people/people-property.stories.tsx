import { PeopleProperty, type PeoplePropertyOption } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

type ExamplePerson = string

const initialOptions: PeoplePropertyOption<ExamplePerson>[] = [
  { imageUrl: undefined, label: 'Bruno Lima', value: 'person-1' },
  { imageUrl: undefined, label: 'Ana Souza', value: 'person-2' },
  { imageUrl: undefined, label: 'Carla Dias', value: 'person-3' },
]

const meta = {
  argTypes: propertyArgTypes,
  component: PeopleProperty,
  parameters: {
    docs: {
      description: {
        component:
          'A coleção inteira num gatilho só: avatar e nome do primeiro, insígnia com o resto, e a busca dentro do popup. Um chip por pessoa cresce em altura e tira a fileira do alinhamento vertical das outras propriedades da unidade.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Properties/People',
} satisfies Meta<typeof PeopleProperty>

export default meta

type Story = StoryObj<typeof PeopleProperty>

export const SelectAndRemove: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Caso editável com catálogo controlado pelo consumer: o gatilho abre o popover, escolher aplica, e escolher de novo quem já está aplicado tira — é multisseleção, e o gatilho resume o resultado.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // O popover do Combobox sai em portal — vive fora de `canvasElement`.
    const body = within(canvasElement.ownerDocument.body)

    const trigger = canvas.getByRole('combobox', { name: 'Participantes' })
    await expect(trigger).toHaveTextContent('Bruno Lima')

    await userEvent.click(trigger)
    await userEvent.click(await body.findByRole('option', { name: 'Ana Souza' }))
    // From the second one on it becomes a badge: the trigger names only the first.
    await expect(trigger).toHaveTextContent('Bruno Lima')
    await expect(trigger).toHaveTextContent('+1')

    await userEvent.click(await body.findByRole('option', { name: 'Bruno Lima' }))
    await expect(trigger).toHaveTextContent('Ana Souza')
    await expect(trigger).not.toHaveTextContent('+1')
  },
  render: () => <PeoplePropertyExample />,
}

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Sem ninguém aplicado o gatilho se explica: o rótulo por extenso, e não um resumo.',
      },
    },
  },
  render: () => <PeoplePropertyExample initial={[]} />,
}

export const ReadOnly: Story = {
  args: {
    options: initialOptions,
    readOnly: true,
    value: ['person-1', 'person-2'],
  },
}

function PeoplePropertyExample({
  initial = ['person-1'],
}: Readonly<{ initial?: readonly ExamplePerson[] }>) {
  const [value, setValue] = useState<readonly ExamplePerson[]>(initial)

  return (
    <div className='max-w-sm p-4'>
      <PeopleProperty
        ariaLabel='Participantes'
        onValueChange={setValue}
        options={initialOptions}
        value={value}
      />
    </div>
  )
}

import { PersonProperty, type PersonPropertyOption } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  expectAvatarEdge,
  expectBadgeSurface,
  expectPlainSurface,
} from '../../../../test-utils/property-surface'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

type ExamplePerson = 'ana' | 'gabriel' | 'marina'

const options: PersonPropertyOption<ExamplePerson>[] = [
  { fallback: 'AM', label: 'Ana Martins', supportingLabel: 'Ops', value: 'ana' },
  { fallback: 'GM', label: 'Gabriel Melo', supportingLabel: 'Owner', value: 'gabriel' },
  { fallback: 'MS', label: 'Marina Souza', supportingLabel: 'Comercial', value: 'marina' },
]

const meta = {
  argTypes: {
    ...propertyArgTypes,
    display: { control: 'inline-radio', options: ['avatar', 'full'] },
  },
  component: PersonProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Unidade de propriedade de pessoa com avatar para assignee, owner, membro ou qualquer referência humana. Badge é a superfície padrão; plain integra a mesma unidade visual em outros componentes.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Person',
} satisfies Meta<typeof PersonProperty>

export default meta

type Story = StoryObj<typeof PersonProperty<ExamplePerson>>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
    await expectAvatarEdge(canvasElement, 20)
  },
  args: {
    options,
    readOnly: true,
    value: 'gabriel',
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
    await expectAvatarEdge(canvasElement, 28)
  },
  args: {
    options,
    readOnly: true,
    value: 'gabriel',
    variant: 'plain',
  },
}

export const AvatarOnly: Story = {
  play: async ({ canvasElement }) => {
    await expectAvatarEdge(canvasElement, 28)
  },
  args: {
    ariaLabel: 'Responsável',
    display: 'avatar',
    options,
    readOnly: true,
    value: 'gabriel',
    variant: 'plain',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Exibição compacta para linhas e cards. Mantém o nome da pessoa no rótulo acessível e apresenta somente o avatar.',
      },
    },
  },
}

export const Trigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Editable use case: the person badge works as the trigger and opens a list in SelectPopup. Use AssignedProperty when the property semantics are responsible person or assignee.',
      },
    },
  },
  render: () => <PersonDropdownExample />,
}

export const Owner: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Owner use case: a person property configured by the consumer with owner-specific label, placeholder, dropdown placement, and update callback.',
      },
    },
  },
  render: () => <OwnerPropertyExample />,
}

export const Empty: Story = {
  args: {
    options,
    placeholder: 'Add members',
    readOnly: true,
    value: null,
  },
}

function PersonDropdownExample() {
  const [value, setValue] = useState<ExamplePerson | null>('gabriel')

  return (
    <div className='p-4'>
      <PersonProperty
        ariaLabel='Assignee'
        options={options}
        placeholder='Add members'
        value={value}
        onValueChange={setValue}
      />
    </div>
  )
}

function OwnerPropertyExample() {
  const [value, setValue] = useState<ExamplePerson | null>('ana')

  return (
    <div className='p-4'>
      <PersonProperty
        ariaLabel='Owner'
        dropdownPlacement={{ align: 'start', side: 'bottom', sideOffset: 8 }}
        options={options}
        placeholder='Add owner'
        value={value}
        onValueChange={setValue}
      />
    </div>
  )
}

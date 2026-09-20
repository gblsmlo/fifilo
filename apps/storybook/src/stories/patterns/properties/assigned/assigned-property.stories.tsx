import {
  AssignedProperty,
  type AssignedPropertyOption,
  type AssignedPropertyProps,
} from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expectBadgeSurface, expectPlainSurface } from '../../../../test-utils/property-surface'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

type ExampleAssignee = 'ana' | 'gabriel' | 'marina'

const options: AssignedPropertyOption<ExampleAssignee>[] = [
  { fallback: 'AM', label: 'Ana Martins', supportingLabel: 'Ops', value: 'ana' },
  { fallback: 'GM', label: 'Gabriel Melo', supportingLabel: 'Owner', value: 'gabriel' },
  { fallback: 'MS', label: 'Marina Souza', supportingLabel: 'Comercial', value: 'marina' },
]

const meta = {
  argTypes: propertyArgTypes,
  component: AssignedProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Assignee property unit for the current responsible person. Badge is the default surface; plain preserves the same avatar and label without badge treatment. Both surfaces remain editable through Select.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Assigned',
} satisfies Meta<typeof AssignedProperty>

export default meta

type Story = StoryObj<AssignedPropertyProps<ExampleAssignee>>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
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
  },
  args: {
    options,
    readOnly: true,
    value: 'gabriel',
    variant: 'plain',
  },
}

export const Trigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Editable use case: the assigned badge works as the trigger and opens a person list in SelectPopup. Use dropdownPlacement to adjust positioning from the consumer.',
      },
    },
  },
  render: () => <AssignedPropertyTriggerStory />,
}

export const Empty: Story = {
  args: {
    options,
    placeholder: 'Add assignee',
    readOnly: true,
    value: null,
  },
}

function AssignedPropertyTriggerStory() {
  const [value, setValue] = useState<ExampleAssignee | null>('gabriel')

  return (
    <div className='p-4'>
      <AssignedProperty
        dropdownPlacement={{ align: 'start', side: 'bottom', sideOffset: 8 }}
        options={options}
        placeholder='Add assignee'
        value={value}
        onValueChange={setValue}
      />
    </div>
  )
}

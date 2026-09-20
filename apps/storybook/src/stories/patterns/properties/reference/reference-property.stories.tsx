import { ReferenceProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { propertyVariantArgType } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: {
    ...propertyVariantArgType,
    kind: { control: 'inline-radio', options: ['account', 'product', 'record'] },
  },
  component: ReferenceProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Unidade de propriedade de referência: chip para produto, conta, lead, atendimento ou outro registro relacionado.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Reference',
} satisfies Meta<typeof ReferenceProperty>

export default meta

type Story = StoryObj<typeof ReferenceProperty>

export const Default: Story = {
  args: {
    kind: 'product',
    label: 'Products',
  },
}

export const Plain: Story = {
  args: {
    kind: 'product',
    label: 'Products',
    variant: 'plain',
  },
}

export const Account: Story = {
  args: {
    kind: 'account',
    label: 'Acme Corp',
  },
}

export const Record: Story = {
  args: {
    kind: 'record',
    label: 'Lead autorizado',
  },
}

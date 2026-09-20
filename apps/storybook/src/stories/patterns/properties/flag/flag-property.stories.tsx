import { FlagProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BotIcon, CircleIcon } from 'lucide-react'
import { expectBadgeSurface, expectPlainSurface } from '../../../../test-utils/property-surface'
import { booleanArgType, propertyVariantArgType } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: {
    ...propertyVariantArgType,
    active: booleanArgType,
    showInactive: booleanArgType,
  },
  component: FlagProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Generic flag property unit for boolean states such as automatic, overdue, blocked, archived, or locked. It renders only active flags unless showInactive is enabled.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Flag',
} satisfies Meta<typeof FlagProperty>

export default meta

type Story = StoryObj<typeof FlagProperty>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
  args: {
    active: true,
    activeIcon: BotIcon,
    ariaLabel: 'Automatic',
    label: 'Automatic',
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
  args: {
    active: true,
    activeIcon: BotIcon,
    ariaLabel: 'Automatic',
    label: 'Automatic',
    variant: 'plain',
  },
}

export const InactiveVisible: Story = {
  args: {
    active: false,
    ariaLabel: 'Overdue',
    inactiveIcon: CircleIcon,
    inactiveLabel: 'On time',
    label: 'Overdue',
    showInactive: true,
  },
}

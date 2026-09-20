import { StatusProperty, type StatusPropertyValue } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect } from 'storybook/test'
import { enforceColorContrast } from '../../../../test-utils/a11y'
import {
  GRAPHIC_CONTRAST_FLOOR,
  computedTokenColor,
  measureIconContrast,
} from '../../../../test-utils/contrast'
import {
  expectAbsenceTone,
  expectBadgeSurface,
  expectPlainSurface,
} from '../../../../test-utils/property-surface'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

const statusValues = [
  'backlog',
  'todo',
  'inProgress',
  'review',
  'done',
  'canceled',
  'blocked',
] as const satisfies readonly StatusPropertyValue[]

const meta = {
  argTypes: {
    ...propertyArgTypes,
    value: { control: 'select', options: statusValues },
  },
  component: StatusProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Propriedade de status com catálogo visual fechado. O pattern define ícone, label e tom; o consumer informa somente o preset, a mutação e a superfície badge (padrão) ou plain.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Status',
} satisfies Meta<typeof StatusProperty>

export default meta

type Story = StoryObj<typeof StatusProperty>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
  args: {
    readOnly: true,
    value: 'inProgress',
  },
}

export const SemValor: Story = {
  args: {
    ariaLabel: 'Status',
    readOnly: true,
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sem status na origem a superfície mostra o preset de repouso do catálogo em tom secundário e emite `data-empty="true"`. O nome acessível recua para a propriedade — anunciar "Planejada" afirmaria um status que ninguém gravou.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expectAbsenceTone(canvasElement)
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
  args: {
    readOnly: true,
    value: 'inProgress',
    variant: 'plain',
  },
}

export const Dropdown: Story = {
  render: () => <StatusDropdownExample />,
}

export const PositionedDropdown: Story = {
  render: () => <StatusPositionedDropdownExample />,
}

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'todo',
    onValueChange: () => undefined,
  },
}

function StatusDropdownExample() {
  const [value, setValue] = useState<StatusPropertyValue>('inProgress')

  return (
    <div className='p-4'>
      <StatusProperty action={setValue} ariaLabel='Estado' value={value} />
    </div>
  )
}

function StatusPositionedDropdownExample() {
  const [value, setValue] = useState<StatusPropertyValue>('inProgress')

  return (
    <div className='flex min-h-40 items-start justify-end p-4'>
      <StatusProperty
        action={setValue}
        ariaLabel='Status'
        dropdownPlacement={{ align: 'end', side: 'bottom', sideOffset: 8 }}
        value={value}
      />
    </div>
  )
}

/**
 * O tom do ícone de status sai dos tokens de tema, e é este ícone que nomeia o
 * grupo quando a Lista agrupa por status.
 *
 * O contraste do ícone é medido à mão: o `color-contrast` do axe ignora elemento
 * sem filho de texto real, e o tom vive num `<svg aria-hidden>`. A regra fica
 * ligada porque cobre o rótulo ao lado.
 */
export const ContrastDark: Story = {
  args: { readOnly: true, value: 'inProgress' },
  globals: { theme: 'dark' },
  parameters: { a11y: enforceColorContrast() },
  play: async ({ canvasElement }) => {
    await expect(measureIconContrast(canvasElement).color).toBe(
      computedTokenColor('--info-foreground'),
    )
  },
}

export const ContrastLight: Story = {
  args: { readOnly: true, value: 'inProgress' },
  globals: { theme: 'light' },
  parameters: { a11y: enforceColorContrast() },
  play: async ({ canvasElement }) => {
    await expect(measureIconContrast(canvasElement).color).toBe(
      computedTokenColor('--info-foreground'),
    )
  },
}

/**
 * Como o cabeçalho de grupo da Lista renderiza o status: `plain`, sem cromo. Aí
 * o ícone nomeia o grupo junto com o texto e vale o piso de 3:1.
 */
export const GroupHeaderContrastDark: Story = {
  args: { readOnly: true, value: 'inProgress', variant: 'plain' },
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expect(measureIconContrast(canvasElement).ratio).toBeGreaterThanOrEqual(
      GRAPHIC_CONTRAST_FLOOR,
    )
  },
}

export const GroupHeaderContrastLight: Story = {
  args: { readOnly: true, value: 'inProgress', variant: 'plain' },
  globals: { theme: 'light' },
  play: async ({ canvasElement }) => {
    await expect(measureIconContrast(canvasElement).ratio).toBeGreaterThanOrEqual(
      GRAPHIC_CONTRAST_FLOOR,
    )
  },
}

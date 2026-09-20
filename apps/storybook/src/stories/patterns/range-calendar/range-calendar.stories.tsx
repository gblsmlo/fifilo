import {
  type DateRange,
  RangeCalendar,
  defaultRangeCalendarPresets,
} from '@fifilo/patterns/range-calendar'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ReactElement, useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'

const TODAY = new Date(2026, 8, 20)

interface RangeCalendarExampleProps {
  /** Months side by side; two is what lets a short range fit without navigating. */
  numberOfMonths?: number
  /** Drops the shortcut rail, leaving the grid alone. */
  withoutPresets?: boolean
}

/**
 * The picker owns no state: the composer holds the range and decides what a
 * choice means. The story keeps it in `useState`, as a route would keep it in
 * the URL.
 */
function RangeCalendarExample({
  numberOfMonths,
  withoutPresets = false,
}: Readonly<RangeCalendarExampleProps>): ReactElement {
  const [value, setValue] = useState<DateRange | undefined>({
    from: new Date(2026, 8, 1),
    to: new Date(2026, 8, 30),
  })

  return (
    <RangeCalendar
      numberOfMonths={numberOfMonths}
      onValueChange={setValue}
      presets={withoutPresets ? [] : defaultRangeCalendarPresets(TODAY)}
      value={value}
    />
  )
}

const meta = {
  component: RangeCalendarExample,
  parameters: {
    docs: {
      description: {
        component:
          'Uma faixa escolhida por atalho ou no próprio calendário, com a trilha de presets à esquerda. O atalho também move o mês visível para a ponta final da faixa, para a escolha aparecer na grade e não só no valor.',
      },
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'RangeCalendar',
} satisfies Meta<typeof RangeCalendarExample>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByRole('button', { name: 'Últimos 7 dias' })).toBeTruthy()
    // Two grids: a short range fits without navigating.
    await expect(canvas.getAllByRole('grid')).toHaveLength(2)
  },
}

export const PresetMovesTheVisibleMonth: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Ano passado' }))

    // The value alone would leave the choice off-screen, months away.
    await expect(await canvas.findByText(/dezembro de 2025|December 2025/i)).toBeTruthy()
  },
}

export const WithoutPresets: Story = {
  args: { numberOfMonths: 1, withoutPresets: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('button', { name: 'Hoje' })).toBeNull()
    await expect(canvas.getAllByRole('grid')).toHaveLength(1)
  },
}

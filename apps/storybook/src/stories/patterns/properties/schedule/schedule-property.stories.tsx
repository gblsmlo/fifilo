import { ScheduleProperty, emptyScheduleValue } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

const meta = {
  args: {
    ariaLabel: 'Data',
    onValueChange: fn(),
    value: {
      ...emptyScheduleValue,
      allDay: false,
      endTime: '16:00',
      from: new Date(2026, 9, 26),
      frequency: 'weekly',
      startTime: '14:00',
      until: '2026-12-18T12:00:00.000Z',
    },
  },
  argTypes: {
    onValueChange: { control: false },
    value: { control: false },
  },
  component: ScheduleProperty,
  decorators: [
    (Story) => (
      <div className='p-4'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Quando algo acontece, numa pílula só: o dropdown traz atalhos com o dia da semana, o calendário, e no rodapé Hora e Repetir. Dias anteriores a hoje não se marcam — regra do próprio picker. Com `dateOnly` vira um prazo: só o dia, sem rodapé. Sem `onValueChange` é leitura, sem gatilho — ramo coberto pelo teste jsdom do pacote. A composição em unidade está em `Widget/Usage/Calendar`.',
      },
    },
    layout: 'centered',
  },
  title: 'Patterns/Properties/Schedule',
} satisfies Meta<typeof ScheduleProperty>

export default meta

type Story = StoryObj<typeof meta>

async function openDropdown(canvasElement: HTMLElement, name: RegExp) {
  await userEvent.click(within(canvasElement).getByRole('button', { name }))

  return waitFor(() => {
    const popup = canvasElement.ownerDocument.querySelector<HTMLElement>(
      '[data-slot="schedule-popup"]',
    )
    if (!popup || popup.clientHeight === 0) throw new Error('o dropdown não abriu')
    return within(popup)
  })
}

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    // Recurrence goes as an icon in the pill and spelled out in the accessible name.
    await expect(
      canvas.getByRole('button', { name: 'Data: 26 de out · 14:00–16:00 · Semanalmente' }),
    ).toHaveTextContent('26 de out · 14:00–16:00')

    const popup = await openDropdown(canvasElement, /^Data:/)
    const presets = within(popup.getByRole('list', { name: 'Atalhos de data' }))

    await expect(presets.getAllByRole('button')).toHaveLength(5)
    await userEvent.click(presets.getByRole('button', { name: /^Amanhã/ }))

    await expect(args.onValueChange).toHaveBeenCalledTimes(1)
  },
}

export const DateOnly: Story = {
  args: { dateOnly: true, fallback: 'Sem prazo', value: emptyScheduleValue },
  parameters: {
    docs: {
      description: {
        story: 'Um prazo: só o dia. Sem Hora, sem Repetir, e a ausência no tom de placeholder.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const popup = await openDropdown(canvasElement, /^Data: Sem prazo/)

    await expect(popup.getByRole('grid')).toBeInTheDocument()
    await expect(popup.queryByRole('button', { name: 'Hora' })).not.toBeInTheDocument()
  },
}

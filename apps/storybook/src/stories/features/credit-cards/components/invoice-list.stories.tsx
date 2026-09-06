import { InvoiceList } from '@features/credit-cards/components/invoice-list'
import { buildStoryInvoice } from '@features/credit-cards/storybook/credit-cards-story-fixtures'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

const meta = {
  args: {
    invoices: [],
    onSelect: fn(),
  },
  component: InvoiceList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'As faturas de um cartão, uma linha por ciclo.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'CreditCards/InvoiceList',
} satisfies Meta<typeof InvoiceList>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Nenhuma fatura ainda')).toBeTruthy()
  },
}

export const WithInvoices: Story = {
  args: {
    invoices: [
      buildStoryInvoice({ status: 'open' }),
      buildStoryInvoice({
        periodEnd: '2026-05-10',
        periodStart: '2026-04-11',
        status: 'closed',
        totalMinor: 8_000,
      }),
      buildStoryInvoice({
        periodEnd: '2026-04-10',
        periodStart: '2026-03-11',
        status: 'paid',
        totalMinor: 6_000,
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Aberta')).toBeTruthy()
    await expect(await canvas.findByText('Fechada')).toBeTruthy()
    await expect(await canvas.findByText('Paga')).toBeTruthy()
  },
}

export const ErrorState: Story = {
  args: {
    error: { message: 'Não foi possível falar com o servidor. Tente novamente.' },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText('Não foi possível carregar as faturas'),
    ).toBeTruthy()
  },
}

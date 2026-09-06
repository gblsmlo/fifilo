import { InvoiceDetail } from '@features/credit-cards/components/invoice-detail'
import {
  buildStoryInvoice,
  buildStoryInvoiceItem,
} from '@features/credit-cards/storybook/credit-cards-story-fixtures'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

const meta = {
  args: {
    invoice: null,
    items: [],
    onClose: fn(),
    onPay: fn(),
    payFromAccountOptions: [{ id: 'acc_checking', name: 'Conta corrente' }],
  },
  component: InvoiceDetail,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A fatura de um cartão: itens agrupados por dia, total e ações de fechar/pagar.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'CreditCards/InvoiceDetail',
} satisfies Meta<typeof InvoiceDetail>

export default meta

type Story = StoryObj<typeof meta>

export const NoneSelected: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Nenhuma fatura selecionada')).toBeTruthy()
  },
}

export const Empty: Story = {
  args: {
    invoice: buildStoryInvoice({ status: 'open' }),
    items: [],
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Fatura vazia')).toBeTruthy()
  },
}

export const Open: Story = {
  args: {
    invoice: buildStoryInvoice({ status: 'open', totalMinor: 0 }),
    items: [buildStoryInvoiceItem(), buildStoryInvoiceItem({ description: 'Farmácia' })],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Fechar fatura')).toBeTruthy()
    await expect(await canvas.findByText('Supermercado')).toBeTruthy()
  },
}

export const Closed: Story = {
  args: {
    invoice: buildStoryInvoice({ status: 'closed', totalMinor: 10_000 }),
    items: [buildStoryInvoiceItem({ amountMinor: -10_000 })],
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Pagar fatura')).toBeTruthy()
  },
}

export const Paid: Story = {
  args: {
    invoice: buildStoryInvoice({
      paidAt: '2026-06-15T12:00:00.000Z',
      status: 'paid',
      totalMinor: 10_000,
    }),
    items: [buildStoryInvoiceItem({ amountMinor: -10_000 })],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByText('Pagar fatura')).toBeNull()
    await expect(canvas.queryByText('Fechar fatura')).toBeNull()
  },
}

export const Overdue: Story = {
  args: {
    invoice: buildStoryInvoice({ status: 'overdue', totalMinor: 15_000 }),
    items: [buildStoryInvoiceItem({ amountMinor: -15_000, description: 'Passagem aérea' })],
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Vencida')).toBeTruthy()
  },
}

import { CollectionPagination } from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'

const meta = {
  args: {
    label: 'Paginação de contatos',
    onPageChange: () => undefined,
    page: 2,
    pageCount: 4,
  },
  argTypes: {
    page: { control: { min: 1, type: 'number' } },
    pageCount: { control: { min: 0, type: 'number' } },
    pageSize: { control: { min: 1, type: 'number' } },
    total: { control: { min: 0, type: 'number' } },
  },
  component: CollectionPagination,
  decorators: [
    (Story) => (
      <div className='w-full max-w-2xl rounded-lg border border-border bg-background'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A paginação de uma coleção: primeira, anterior, `página / total`, próxima e última, com o resumo do recorte visível (`1–25 de 57`) quando `total` e `pageSize` são conhecidos. Serve a coleção paginada pelo servidor e a tabela. O consumer decide quando mostrá-la; o pacote fixa anatomia, rótulos e as pontas desabilitadas.',
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs'],
  title: 'Patterns/Collections/Pagination',
} satisfies Meta<typeof CollectionPagination>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithRangeSummary: Story = {
  args: { page: 3, pageCount: 3, pageSize: 25, total: 57 },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)

    await expect(screen.getByText('51–57 de 57')).toBeInTheDocument()
    await expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
    await expect(screen.getByRole('button', { name: 'Última página' })).toBeDisabled()
  },
}

function Controlled() {
  const [page, setPage] = useState(1)

  return (
    <CollectionPagination
      label='Paginação de casos e processos'
      onPageChange={setPage}
      page={page}
      pageCount={5}
      pageSize={25}
      total={112}
    />
  )
}

export const ControlledPaging: Story = {
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)

    await expect(screen.getByRole('button', { name: 'Primeira página' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }))
    await expect(screen.getByText('2 / 5')).toBeInTheDocument()
    await expect(screen.getByText('26–50 de 112')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Última página' }))
    await expect(screen.getByText('101–112 de 112')).toBeInTheDocument()
    await expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  },
  render: () => <Controlled />,
}

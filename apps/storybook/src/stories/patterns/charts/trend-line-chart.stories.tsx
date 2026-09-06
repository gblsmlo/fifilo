import { TrendLineChart } from '@fifilo/patterns/charts/trend-line-chart'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'

const formatBRL = (value: number) =>
  (value / 100).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })

const meta = {
  args: {
    data: [
      { expenseMinor: 320_000, incomeMinor: 520_000, x: '2026-01' },
      { expenseMinor: 410_000, incomeMinor: 520_000, x: '2026-02' },
      { expenseMinor: 280_000, incomeMinor: 580_000, x: '2026-03' },
      { expenseMinor: 360_000, incomeMinor: 520_000, x: '2026-04' },
    ],
    series: [
      { key: 'incomeMinor', label: 'Receita' },
      { key: 'expenseMinor', label: 'Despesa' },
    ],
    state: 'data',
    surface: { description: 'Sem movimentação no período selecionado.', title: 'Fluxo mensal' },
    valueFormatter: formatBRL,
    xAxisLabel: 'Mês',
  },
  component: TrendLineChart,
  decorators: [
    (Story) => (
      <div className='w-full max-w-2xl p-6'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Série temporal neutra de domínio (Fase 05 § Web): a feature projeta os pontos e diz o rótulo de cada série, o gráfico não sabe o que é receita ou despesa. Cada série soma cor (`--chart-1`..`--chart-5`) a um traço próprio - sólido, tracejado, pontilhado - para nunca depender só da cor. Uma tabela `sr-only` carrega os mesmos dados para leitor de tela.',
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Charts/TrendLine',
} satisfies Meta<typeof TrendLineChart>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // The legend renders its own tiny `svg.recharts-surface` per item (its
    // color swatch), so the main chart canvas needs a selector that survives
    // that collision - it is the one holding the grid.
    const chart = await waitFor(() => {
      const svg = canvasElement.querySelector('svg.recharts-surface:has(.recharts-cartesian-grid)')
      if (!svg || svg.clientWidth === 0) throw new Error('o gráfico ainda não mediu layout real')
      return svg
    })

    // Duas séries, dois traços distintos - a cor nunca é o único canal
    // (Fase 05 § Web).
    const lines = chart.querySelectorAll('.recharts-line-curve')
    expect(lines).toHaveLength(2)
    expect(lines[0]?.getAttribute('stroke-dasharray')).not.toBe(
      lines[1]?.getAttribute('stroke-dasharray'),
    )

    const screen = within(canvasElement)
    await expect(screen.getByRole('img', { name: 'Fluxo mensal' })).toBeVisible()
  },
}

export const AccessibleTableBehindTheChart: Story = {
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    const table = canvasElement.querySelector('table')
    expect(table).not.toBeNull()

    // Presente no DOM para o leitor de tela, mas fora do fluxo visual - a
    // classe `sr-only` do Tailwind, não `hidden`.
    expect(table?.className).toContain('sr-only')
    await expect(screen.getByRole('columnheader', { name: 'Receita' })).toBeInTheDocument()
    await expect(screen.getByRole('row', { name: /2026-01/ })).toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: { data: [], state: 'empty' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(screen.getByText('Fluxo mensal')).toBeInTheDocument()
    expect(canvasElement.querySelector('svg.recharts-surface')).toBeNull()
    expect(canvasElement.querySelector('table')).toBeNull()
  },
}

export const Loading: Story = {
  args: { data: [], state: 'loading' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(screen.getByRole('status')).toBeInTheDocument()
  },
}

export const Failure: Story = {
  args: {
    data: [],
    state: 'error',
    surface: { description: 'Tente novamente em instantes.', title: 'Falha ao carregar o fluxo' },
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(screen.getByRole('alert')).toBeInTheDocument()
  },
}

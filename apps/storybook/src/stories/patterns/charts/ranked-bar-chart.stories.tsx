import { RankedBarChart } from '@fifilo/patterns/charts/ranked-bar-chart'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'

const formatBRL = (value: number) =>
  (value / 100).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })

const meta = {
  args: {
    data: [
      { id: 'mercado', label: 'Mercado', value: 750_00 },
      { id: 'transporte', label: 'Transporte', value: 250_00 },
      { id: 'lazer', label: 'Lazer', value: 120_00 },
    ],
    state: 'data',
    surface: { description: 'Sem gasto no período selecionado.', title: 'Gasto por categoria' },
    valueFormatter: formatBRL,
    valueLabel: 'Total gasto',
  },
  component: RankedBarChart,
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
          'Ranking neutro de domínio (Fase 05 § Web): backend de gasto por categoria e por conta ao mesmo tempo, já que ambos são "um valor por rótulo, ordenado". O valor é impresso na própria barra (`LabelList`), então comparar duas barras nunca depende só da cor. Uma tabela `sr-only` carrega os mesmos dados para leitor de tela.',
      },
    },
    layout: 'padded',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Charts/RankedBar',
} satisfies Meta<typeof RankedBarChart>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const chart = await waitFor(() => {
      const svg = canvasElement.querySelector('svg.recharts-surface')
      if (!svg || svg.clientWidth === 0) throw new Error('o gráfico ainda não mediu layout real')
      return svg
    })

    const bars = chart.querySelectorAll('.recharts-bar-rectangle')
    expect(bars).toHaveLength(3)

    // O valor impresso na própria barra (`LabelList`, não o eixo) - a cor
    // nunca é o único canal (Fase 05 § Web).
    const barLabels = [...chart.querySelectorAll('.recharts-label')].map((node) => node.textContent)
    expect(barLabels.some((text) => text?.includes('750'))).toBe(true)
  },
}

/**
 * Toda cor vem de `var(--color-chart-N)` (Decision 027), nunca um valor
 * fixo, então o mesmo gráfico já é o do tema claro sob o toggle `Theme` da
 * toolbar - fixado aqui via `globals` para que o par claro/escuro seja
 * conferido em toda execução de `storybook:test`.
 */
export const LightTheme: Story = {
  globals: { theme: 'light' },
  play: async ({ canvasElement }) => {
    const chart = await waitFor(() => {
      const svg = canvasElement.querySelector('svg.recharts-surface')
      if (!svg || svg.clientWidth === 0) throw new Error('o gráfico ainda não mediu layout real')
      return svg
    })

    expect(chart.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(3)
  },
}

export const AccessibleTableBehindTheChart: Story = {
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    const table = canvasElement.querySelector('table')
    expect(table).not.toBeNull()
    expect(table?.className).toContain('sr-only')

    // `toLocaleString` intercala um espaço "non-breaking" entre "R$" e o
    // valor no navegador - o nome acessível da linha carrega esse mesmo
    // caractere, não um espaço comum.
    await expect(
      screen.getByRole('row', { name: `Mercado ${formatBRL(750_00)}` }),
    ).toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: { data: [], state: 'empty' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(screen.getByText('Gasto por categoria')).toBeInTheDocument()
    expect(canvasElement.querySelector('svg.recharts-surface')).toBeNull()
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
    surface: { description: 'Tente novamente em instantes.', title: 'Falha ao carregar o gasto' },
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(screen.getByRole('alert')).toBeInTheDocument()
  },
}

import { CategoryList } from '@features/categories/components/category-list'
import { buildStoryCategory } from '@features/categories/storybook/categories-story-fixtures'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

const meta = {
  args: {
    categories: [],
    onReassign: fn(),
    onReassignReset: fn(),
  },
  component: CategoryList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Lista de categorias, com arquivamento direto ou reatribuição quando há transações.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Categories/CategoryList',
} satisfies Meta<typeof CategoryList>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('Nenhuma categoria ainda')).toBeTruthy()
  },
}

export const WithCategories: Story = {
  args: {
    categories: [
      buildStoryCategory({ kind: 'expense', name: 'Mercado' }),
      buildStoryCategory({ kind: 'income', name: 'Salário' }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('Mercado')).toBeTruthy()
    await expect(await canvas.findByText('Salário')).toBeTruthy()
  },
}

import { PropertyTrigger } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserPlusIcon } from 'lucide-react'
import { expect, within } from 'storybook/test'
import {
  expectAbsenceTone,
  expectBadgeFill,
  expectBadgeSurface,
  expectPlainSurface,
} from '../../../test-utils/property-surface'
import { propertyVariantArgType } from '../../../test-utils/story-arg-types'

const meta = {
  argTypes: propertyVariantArgType,
  component: PropertyTrigger,
  parameters: {
    docs: {
      description: {
        component:
          'A superfície de uma property quando se clica nela. Serve de `render` para o gatilho de `Select`, `Combobox` ou `Popover`, que continua sendo quem abre o catálogo. `badge` nasce preenchida; `plain` retém o preenchimento até o ponteiro chegar, e a pílula do hover é desenhada fora da caixa para o valor não sair do lugar. O hover se confere no navegador — `:hover` do CSS não responde a evento sintético.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Trigger',
} satisfies Meta<typeof PropertyTrigger>

export default meta

type Story = StoryObj<typeof PropertyTrigger>

export const Badge: Story = {
  args: {
    'aria-label': 'Responsável',
    children: 'Mariana Alves',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', { name: 'Responsável' })).toBeVisible()
    await expectBadgeSurface(canvasElement)
  },
}

export const Plain: Story = {
  args: {
    'aria-label': 'Responsável',
    children: 'Mariana Alves',
    variant: 'plain',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Em repouso a superfície não ocupa lugar nenhum além do próprio texto: a pílula do hover vem de `::before`, com o recuo e o raio da `badge`, e sangra para fora sem mover o valor nem mudar a largura da fileira.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
    await expectBadgeFill(canvasElement)
  },
}

export const PlainVazio: Story = {
  args: {
    'aria-label': 'Responsável',
    children: (
      <>
        <UserPlusIcon aria-hidden className='size-3' />
        Sem responsável
      </>
    ),
    muted: true,
    variant: 'plain',
  },
  play: async ({ canvasElement }) => {
    await expectAbsenceTone(canvasElement)
    await expectBadgeFill(canvasElement)
  },
}

export const RenderComoLink: Story = {
  args: {
    'aria-label': 'Empresa',
    children: 'Jars Advocacia',
    render: <a href='#property-trigger-story'>Jars Advocacia</a>,
    variant: 'plain',
  },
  parameters: {
    docs: {
      description: {
        story:
          'O `render` decide o elemento; sem ele o gatilho é um `<button>`. O preenchimento do hover vale para os dois, porque a regra é do elemento (`button`/`a`), não da variante.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('link', { name: 'Empresa' })).toBeVisible()
  },
}

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import { AppAuthLayout } from '../../../../web/src/layouts/app-auth-layout'
import { AUTH_STORY_APP_NAME } from '../../test-utils/auth-story-layout'

function FormPlaceholder() {
  return (
    <div
      className='flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm'
      data-slot='auth-layout-placeholder'
    >
      Formulário de acesso
    </div>
  )
}

const meta = {
  args: {
    appName: AUTH_STORY_APP_NAME,
    children: <FormPlaceholder />,
  },
  component: AppAuthLayout,
  parameters: {
    docs: {
      description: {
        component:
          'Moldura das rotas de acesso, aplicada pelo grupo `(auth)`. Ela decide a divisao entre a coluna do formulario e o painel de imagem, a marca acima do conteudo e o limite de 384px da coluna. O nome do produto chega por prop: o layout nao le ambiente, quem le e a rota.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Auth',
} satisfies Meta<typeof AppAuthLayout>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const placeholder = await within(canvasElement).findByText('Formulário de acesso')
    const column = placeholder.parentElement

    // O limite de 384px do formulario e contrato desta moldura, e em jsdom a
    // classe passaria mesmo sem resolver.
    await expect(column?.clientWidth).toBe(384)
  },
}

export const NarrowViewport: Story = {
  globals: { viewport: { isRotated: false, value: 'mobile' } },
  parameters: {
    docs: {
      description: {
        story:
          'Abaixo de `lg` o painel de imagem sai de cena e a coluna do formulario ocupa a tela inteira, ainda limitada a 384px.',
      },
    },
  },
}

export const LongProductName: Story = {
  args: { appName: 'Fifilo Plataforma de Operações' },
  parameters: {
    docs: {
      description: {
        story:
          'O nome do produto vem do ambiente e nao tem limite de tamanho. Com o `tracking` largo da marca, e o caso que primeiro quebra em duas linhas.',
      },
    },
  },
}

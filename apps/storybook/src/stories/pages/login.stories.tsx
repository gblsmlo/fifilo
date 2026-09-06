import { SignInPage } from '@features/auth/pages/sign-in-page'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import { withAuthLayout } from '../../test-utils/auth-story-layout'
import { withAuthRoute } from '../../test-utils/auth-story-router'

const meta = {
  args: {
    redirectTo: authStoryFixtures.redirectTo,
  },
  component: SignInPage,
  decorators: [withAuthLayout, withAuthRoute],
  parameters: {
    docs: {
      description: {
        component:
          'Rota `/login`. A pagina acrescenta ao formulario o cabecalho e o rodape de cadastro; o destino pos-login viaja em `redirectTo`.',
      },
    },
    // O layout de acesso ocupa a viewport inteira; `centered` o encolheria ate a
    // largura do conteudo e o painel de imagem sumiria.
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Login',
} satisfies Meta<typeof SignInPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByRole('heading', { name: 'Entrar' })).toBeTruthy()
    await expect(canvas.queryByRole('alert')).toBeNull()
  },
}

export const WithKnownEmail: Story = {
  args: { initialEmail: authStoryFixtures.email },
  parameters: {
    docs: {
      description: {
        story: 'Volta do cadastro ou da recuperacao de senha, que devolvem o e-mail em `?email=`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const email = await within(canvasElement).findByLabelText<HTMLInputElement>('Email')

    await expect(email.value).toBe(authStoryFixtures.email)
  },
}

export const NarrowViewport: Story = {
  globals: { viewport: { isRotated: false, value: 'mobile' } },
  parameters: {
    docs: {
      description: {
        story: 'No celular a coluna ocupa a largura disponivel, abaixo do teto de 384px.',
      },
    },
  },
}

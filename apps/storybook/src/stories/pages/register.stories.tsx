import { SignUpPage } from '@features/auth/pages/sign-up-page'
import { authStoryFixtures } from '@features/auth/storybook/auth-story-fixtures'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import { withAuthLayout } from '../../test-utils/auth-story-layout'
import { withAuthRoute } from '../../test-utils/auth-story-router'

const meta = {
  args: {
    redirectTo: authStoryFixtures.redirectTo,
  },
  component: SignUpPage,
  decorators: [withAuthLayout, withAuthRoute],
  parameters: {
    docs: {
      description: {
        component:
          'Rota `/sign-up`. A pagina nao tem estado proprio: o destino pos-cadastro viaja em `redirectTo` e todo o resto do fluxo pertence ao formulario.',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Register',
} satisfies Meta<typeof SignUpPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByRole('heading', { name: 'Criar conta' })).toBeTruthy()
    await expect(canvas.getByLabelText('Nome')).toBeTruthy()
  },
}

export const NarrowViewport: Story = {
  globals: { viewport: { isRotated: false, value: 'mobile' } },
  parameters: {
    docs: {
      description: {
        story:
          'Quatro campos empilhados no celular: e a pagina de acesso mais alta, e a que rola primeiro.',
      },
    },
  },
}

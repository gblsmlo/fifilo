import type { Meta, StoryObj } from '@storybook/react-vite'
import { OnboardingLayout } from '@web/layouts/onboarding-layout'
import { expect, within } from 'storybook/test'

const meta = {
  component: OnboardingLayout,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs', 'storybook-test'],
  title: 'Onboarding/OnboardingLayout',
} satisfies Meta<typeof OnboardingLayout>

export default meta

type Story = StoryObj<typeof meta>

export const FocusedShell: Story = {
  args: {
    appName: 'Fifilo',
    children: (
      <div className='rounded-lg border bg-card p-8 text-card-foreground'>
        Conteúdo da configuração
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Fifilo')).toBeTruthy()
    await expect(await canvas.findByText('Conteúdo da configuração')).toBeTruthy()
    await expect(canvas.queryByTestId('app-sidebar')).toBeNull()
  },
}

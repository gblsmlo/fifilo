import type { Meta, StoryObj } from '@storybook/react-vite'

import { ScrollArea } from '@twincam/ui/components/scroll-area'

const activities = [
  'Workspace criado.',
  'Marina Costa aceitou o convite.',
  'Autenticação em dois fatores ativada.',
  'Nome da organização atualizado.',
  'Novo administrador adicionado.',
  'Sessão iniciada em um novo dispositivo.',
  'Convite pendente cancelado.',
  'Política de acesso revisada.',
]

const meta = {
  component: ScrollArea,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/ScrollArea',
} satisfies Meta<typeof ScrollArea>

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <ScrollArea className='h-64 w-96 rounded-lg border p-3'>
      <ol className='space-y-3'>
        {activities.map((activity, index) => (
          <li className='border-b pb-3 text-sm last:border-0' key={activity}>
            <span className='me-2 text-muted-foreground'>{index + 1}.</span>
            {activity}
          </li>
        ))}
      </ol>
    </ScrollArea>
  ),
}

export const WithFadeAndGutter: Story = {
  render: () => (
    <ScrollArea className='h-64 w-96 rounded-lg border p-3' scrollFade scrollbarGutter>
      <ol className='space-y-3'>
        {activities.map((activity, index) => (
          <li className='border-b pb-3 text-sm last:border-0' key={activity}>
            <span className='me-2 text-muted-foreground'>{index + 1}.</span>
            {activity}
          </li>
        ))}
      </ol>
    </ScrollArea>
  ),
}

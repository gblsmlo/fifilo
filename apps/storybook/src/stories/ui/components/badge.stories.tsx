import { Badge } from '@fifilo/ui/components/badge'
import type { Meta, StoryObj } from '@storybook/react-vite'

const variants = [
  ['Default', 'default'],
  ['Secondary', 'secondary'],
  ['Outline', 'outline'],
  ['Success', 'success'],
  ['Info', 'info'],
  ['Warning', 'warning'],
  ['Error', 'error'],
  ['Destructive', 'destructive'],
] as const

const meta = {
  args: {
    children: 'Ativo',
  },
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Badge',
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-3'>
      {variants.map(([label, variant]) => (
        <Badge key={variant} variant={variant}>
          {label}
        </Badge>
      ))}
    </div>
  ),
}

export const RenderAsLink: Story = {
  args: {
    children: 'Ver tarefas',
    render: <a href='#badge-story'>Ver tarefas</a>,
    variant: 'outline',
  },
}

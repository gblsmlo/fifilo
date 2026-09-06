import { Button } from '@fifilo/ui/components/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowRightIcon, PlusIcon, Trash2Icon } from 'lucide-react'

const variants = [
  ['Primary', 'default'],
  ['Secondary', 'secondary'],
  ['Outline', 'outline'],
  ['Ghost', 'ghost'],
  ['Link', 'link'],
  ['Destructive', 'destructive'],
  ['Destructive outline', 'destructive-outline'],
] as const

const textSizes = ['sm', 'default', 'lg', 'xl'] as const
const iconSizes = ['icon-sm', 'icon', 'icon-lg', 'icon-xl'] as const

const meta = {
  argTypes: {
    className: { control: false },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    render: { control: false },
    size: {
      control: 'select',
      options: [...textSizes, ...iconSizes],
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
    variant: {
      control: 'select',
      options: variants.map(([, value]) => value),
    },
  },
  args: {
    children: 'Criar tarefa',
    type: 'button',
  },
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Foundation/Button',
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-3'>
      {variants.map(([label, variant]) => (
        <Button key={variant} variant={variant}>
          {label}
        </Button>
      ))}
    </div>
  ),
}

export const TextSizes: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-3'>
      {textSizes.map((size) => (
        <Button key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
}

export const IconSizes: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-3'>
      {iconSizes.map((size) => (
        <Button aria-label={`Adicionar tarefa (${size})`} key={size} size={size}>
          <PlusIcon />
        </Button>
      ))}
    </div>
  ),
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        Criar tarefa
        <PlusIcon />
      </>
    ),
  },
}

export const IconOnly: Story = {
  render: () => (
    <div className='flex items-center gap-3'>
      <Button aria-label='Adicionar tarefa' size='icon'>
        <PlusIcon />
      </Button>
      <Button aria-label='Excluir tarefa' size='icon' variant='destructive-outline'>
        <Trash2Icon />
      </Button>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-3'>
      {variants.map(([label, variant]) => (
        <Button disabled key={variant} variant={variant}>
          {label}
        </Button>
      ))}
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-3'>
      {variants.map(([label, variant]) => (
        <Button key={variant} loading variant={variant}>
          Salvando {label}
        </Button>
      ))}
    </div>
  ),
}

export const RenderAsLink: Story = {
  args: {
    children: (
      <>
        Abrir tarefa
        <ArrowRightIcon />
      </>
    ),
    render: <a href='#button-story'>Abrir tarefa</a>,
    variant: 'outline',
  },
}

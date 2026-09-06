import type { Meta, StoryObj } from '@storybook/react-vite'

import { Input } from '@twincam/ui/components/input'

const meta = {
  args: {
    'aria-label': 'Nome do contato',
    placeholder: 'Digite um nome',
    size: 'lg',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['lg'],
    },
  },
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Input',
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

export const Search: Story = {
  args: {
    'aria-label': 'Buscar contatos',
    nativeInput: true,
    placeholder: 'Buscar contatos',
    type: 'search',
  },
  decorators: [
    (Story) => (
      <div className='w-80'>
        <Story />
      </div>
    ),
  ],
}

export const File: Story = {
  args: {
    'aria-label': 'Anexar documento',
    nativeInput: true,
    type: 'file',
  },
  decorators: [
    (Story) => (
      <div className='w-80'>
        <Story />
      </div>
    ),
  ],
}

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
    'aria-label': 'E-mail',
    defaultValue: 'contato@',
    type: 'email',
  },
  decorators: [
    (Story) => (
      <div className='w-80'>
        <Story />
      </div>
    ),
  ],
}

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Nao editavel',
  },
  decorators: [
    (Story) => (
      <div className='w-80'>
        <Story />
      </div>
    ),
  ],
}

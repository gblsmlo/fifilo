import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field, FieldDescription, FieldError, FieldLabel } from '@twincam/ui/components/field'
import { Textarea } from '@twincam/ui/components/textarea'

const meta = {
  args: {
    'aria-label': 'Observacao',
    placeholder: 'Adicione uma observacao...',
  },
  component: Textarea,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Textarea',
} satisfies Meta<typeof Textarea>

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {
  decorators: [
    (Story) => (
      <div className='w-96'>
        <Story />
      </div>
    ),
  ],
}

export const Sizes: Story = {
  render: () => (
    <div className='grid w-96 gap-3'>
      {(['sm', 'default', 'lg'] as const).map((size) => (
        <Textarea
          aria-label={`Observacao ${size}`}
          key={size}
          placeholder={`Tamanho ${size}`}
          size={size}
        />
      ))}
    </div>
  ),
}

export const InField: Story = {
  render: () => (
    <Field className='w-96' name='note'>
      <FieldLabel htmlFor='textarea-note'>Observacao</FieldLabel>
      <Textarea id='textarea-note' placeholder='Registre um contexto relevante para a equipe.' />
      <FieldDescription>O historico fica visivel para os membros do workspace.</FieldDescription>
    </Field>
  ),
}

export const Invalid: Story = {
  render: () => (
    <Field className='w-96' invalid name='note'>
      <FieldLabel htmlFor='textarea-invalid'>Observacao</FieldLabel>
      <Textarea aria-invalid defaultValue='Curto' id='textarea-invalid' />
      <FieldError>Escreva pelo menos 10 caracteres.</FieldError>
    </Field>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Este registro foi arquivado e nao pode ser alterado.',
  },
  decorators: [
    (Story) => (
      <div className='w-96'>
        <Story />
      </div>
    ),
  ],
}

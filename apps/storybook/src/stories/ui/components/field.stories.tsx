import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field, FieldDescription, FieldError, FieldLabel } from '@twincam/ui/components/field'
import { Input } from '@twincam/ui/components/input'

const meta = {
  component: Field,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Field',
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof meta>

export const WithDescription: Story = {
  render: () => (
    <Field className='w-80' name='display-name'>
      <FieldLabel htmlFor='field-display-name'>Nome de exibição</FieldLabel>
      <Input id='field-display-name' placeholder='Como devemos chamar você?' />
      <FieldDescription>Este nome sera exibido no workspace.</FieldDescription>
    </Field>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Field className='w-80' disabled name='workspace-name'>
      <FieldLabel htmlFor='field-workspace-name'>Workspace</FieldLabel>
      <Input defaultValue='Acme' id='field-workspace-name' />
      <FieldDescription>O nome e gerenciado pela administracao.</FieldDescription>
    </Field>
  ),
}

export const Invalid: Story = {
  render: () => (
    <Field className='w-80' invalid name='account-email'>
      <FieldLabel htmlFor='field-account-email'>E-mail</FieldLabel>
      <Input aria-invalid defaultValue='pessoa@' id='field-account-email' type='email' />
      <FieldError>Informe um e-mail valido.</FieldError>
    </Field>
  ),
}

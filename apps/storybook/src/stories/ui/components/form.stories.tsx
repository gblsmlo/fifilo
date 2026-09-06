import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@twincam/ui/components/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@twincam/ui/components/field'
import { Form } from '@twincam/ui/components/form'
import { Input } from '@twincam/ui/components/input'

const meta = {
  component: Form,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Form',
} satisfies Meta<typeof Form>

export default meta

type Story = StoryObj<typeof meta>

export const Valid: Story = {
  render: () => (
    <Form
      className='flex w-96 flex-col gap-5'
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <Field name='name'>
        <FieldLabel htmlFor='form-name'>Nome</FieldLabel>
        <Input defaultValue='Marina Costa' id='form-name' />
        <FieldDescription>Usado para identificar o contato no funil.</FieldDescription>
      </Field>
      <Button className='self-end' type='submit'>
        Salvar contato
      </Button>
    </Form>
  ),
}

export const Invalid: Story = {
  render: () => (
    <Form
      className='flex w-96 flex-col gap-5'
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <Field invalid name='email'>
        <FieldLabel htmlFor='form-email'>E-mail</FieldLabel>
        <Input aria-invalid defaultValue='marina@' id='form-email' type='email' />
        <FieldError>Informe um e-mail valido para salvar o contato.</FieldError>
      </Field>
      <Button className='self-end' type='submit'>
        Salvar contato
      </Button>
    </Form>
  ),
}

import { Field, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectLabel,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MoreHorizontalIcon, SignalHighIcon, SignalLowIcon } from 'lucide-react'

const meta = {
  component: Select,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Select',
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Select defaultValue='medium'>
      <SelectTrigger aria-label='Prioridade' className='w-72'>
        <SelectValue placeholder='Selecione uma prioridade' />
      </SelectTrigger>
      <SelectPopup>
        <SelectLabel>Prioridade</SelectLabel>
        <SelectItem value='low'>Baixa</SelectItem>
        <SelectItem value='medium'>Media</SelectItem>
        <SelectItem value='high'>Alta</SelectItem>
      </SelectPopup>
    </Select>
  ),
}

export const GroupedOptions: Story = {
  render: () => (
    <Select>
      <SelectTrigger aria-label='Responsavel' className='w-72'>
        <SelectValue placeholder='Selecione uma pessoa' />
      </SelectTrigger>
      <SelectPopup>
        <SelectGroup>
          <SelectGroupLabel>Membros</SelectGroupLabel>
          <SelectItem value='marina'>Marina Costa</SelectItem>
          <SelectItem value='rafael'>Rafael Nunes</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectGroupLabel>Indisponiveis</SelectGroupLabel>
          <SelectItem disabled value='ana'>
            Ana Lima
          </SelectItem>
        </SelectGroup>
      </SelectPopup>
    </Select>
  ),
}

export const DesignSpec: Story = {
  render: () => (
    <Field className='w-72' name='priority'>
      <FieldLabel>Prioridade</FieldLabel>
      <Select defaultOpen defaultValue='medium'>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          <SelectLabel>Opções de prioridade</SelectLabel>
          <SelectItem value='low'>Baixa</SelectItem>
          <SelectItem value='medium'>Média</SelectItem>
          <SelectItem value='high'>Alta</SelectItem>
        </SelectPopup>
      </Select>
    </Field>
  ),
}

export const WithoutSelectedIndicator: Story = {
  render: () => (
    <Select defaultOpen defaultValue='high'>
      <SelectTrigger aria-label='Priority' className='w-72'>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false}>
        <SelectLabel>Priority</SelectLabel>
        <SelectItem showIndicator={false} value='no_priority'>
          <span className='flex items-center gap-2'>
            <MoreHorizontalIcon aria-hidden className='size-4 text-muted-foreground' />
            No priority
          </span>
        </SelectItem>
        <SelectItem showIndicator={false} value='high'>
          <span className='flex items-center gap-2'>
            <SignalHighIcon aria-hidden className='size-4 text-muted-foreground' />
            High
          </span>
        </SelectItem>
        <SelectItem showIndicator={false} value='low'>
          <span className='flex items-center gap-2'>
            <SignalLowIcon aria-hidden className='size-4 text-muted-foreground' />
            Low
          </span>
        </SelectItem>
      </SelectPopup>
    </Select>
  ),
}

export const Invalid: Story = {
  render: () => (
    <Field className='w-72' invalid name='priority'>
      <FieldLabel>Prioridade</FieldLabel>
      <Select>
        <SelectTrigger aria-invalid>
          <SelectValue placeholder='Selecione uma prioridade' />
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value='low'>Baixa</SelectItem>
          <SelectItem value='high'>Alta</SelectItem>
        </SelectPopup>
      </Select>
      <FieldError>Escolha uma prioridade.</FieldError>
    </Field>
  ),
}

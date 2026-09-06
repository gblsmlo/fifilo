import { Button } from '@fifilo/ui/components/button'
import {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from '@fifilo/ui/components/popover'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  component: Popover,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Popover',
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

export const FilterForm: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant='outline' />}>Filtros</PopoverTrigger>
      <PopoverPopup align='start' className='w-72'>
        <div className='flex flex-col gap-3'>
          <div className='space-y-1'>
            <PopoverTitle>Filtrar registros</PopoverTitle>
            <PopoverDescription>Refine a lista sem sair da visualizacao atual.</PopoverDescription>
          </div>
          <div className='flex justify-end gap-2'>
            <PopoverClose render={<Button size='sm' variant='ghost' />}>Cancelar</PopoverClose>
            <PopoverClose render={<Button size='sm' />}>Aplicar</PopoverClose>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  ),
}

export const TooltipStyle: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant='outline' />}>Informacao</PopoverTrigger>
      <PopoverPopup side='top' tooltipStyle>
        <PopoverTitle className='sr-only'>Informacao</PopoverTitle>
        Esta acao permanece disponivel para administradores.
      </PopoverPopup>
    </Popover>
  ),
}

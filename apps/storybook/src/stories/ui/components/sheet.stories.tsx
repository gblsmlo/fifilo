import { Button } from '@fifilo/ui/components/button'
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from '@fifilo/ui/components/sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'

function SheetContent() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Detalhes da tarefa</SheetTitle>
        <SheetDescription>Revise o contexto e defina a proxima acao.</SheetDescription>
      </SheetHeader>
      <SheetPanel className='space-y-5'>
        <section className='space-y-2'>
          <h3 className='font-medium text-sm'>Qualificar o contato</h3>
          <p className='text-muted-foreground text-sm'>
            Confirme o interesse, a area de pratica e a disponibilidade para uma reuniao.
          </p>
        </section>
        <dl className='grid gap-3 text-sm'>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Responsavel</dt>
            <dd>Marina Costa</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Prazo</dt>
            <dd>Hoje, 16:00</dd>
          </div>
        </dl>
      </SheetPanel>
      <SheetFooter>
        <Button variant='outline'>Cancelar</Button>
        <Button>Salvar alteracoes</Button>
      </SheetFooter>
    </>
  )
}

const meta = {
  component: Sheet,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  title: 'Foundation/Sheet',
} satisfies Meta<typeof Sheet>

export default meta

type Story = StoryObj<typeof meta>

export const Right: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger render={<Button className='m-6' />}>Abrir detalhes</SheetTrigger>
      <SheetPopup side='right'>
        <SheetContent />
      </SheetPopup>
    </Sheet>
  ),
}

export const BottomInset: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger render={<Button className='m-6' />}>Abrir detalhes</SheetTrigger>
      <SheetPopup side='bottom' variant='inset'>
        <SheetContent />
      </SheetPopup>
    </Sheet>
  ),
}

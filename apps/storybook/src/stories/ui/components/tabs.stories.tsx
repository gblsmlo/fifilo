import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@twincam/ui/components/tabs'
import { CalendarIcon, FileTextIcon, ListTodoIcon } from 'lucide-react'

function TabPanels() {
  return (
    <>
      <TabsPanel value='overview'>
        <p className='rounded-lg border p-4 text-sm'>Resumo da oportunidade e proxima acao.</p>
      </TabsPanel>
      <TabsPanel value='tasks'>
        <p className='rounded-lg border p-4 text-sm'>Tres tarefas pendentes para este contato.</p>
      </TabsPanel>
      <TabsPanel value='notes'>
        <p className='rounded-lg border p-4 text-sm'>Nenhuma anotacao registrada ainda.</p>
      </TabsPanel>
    </>
  )
}

const meta = {
  component: Tabs,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Tabs',
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <Tabs className='w-96' defaultValue='overview'>
      <TabsList>
        <TabsTab value='overview'>Visao geral</TabsTab>
        <TabsTab value='tasks'>Tarefas</TabsTab>
        <TabsTab value='notes'>Notas</TabsTab>
      </TabsList>
      <TabPanels />
    </Tabs>
  ),
}

export const Underline: Story = {
  render: () => (
    <Tabs className='w-96' defaultValue='tasks'>
      <TabsList variant='underline'>
        <TabsTab value='overview'>
          <CalendarIcon />
          Visao geral
        </TabsTab>
        <TabsTab value='tasks'>
          <ListTodoIcon />
          Tarefas
        </TabsTab>
        <TabsTab value='notes'>
          <FileTextIcon />
          Notas
        </TabsTab>
      </TabsList>
      <TabPanels />
    </Tabs>
  ),
}

export const Vertical: Story = {
  render: () => (
    <Tabs className='w-96' defaultValue='overview' orientation='vertical'>
      <TabsList variant='underline'>
        <TabsTab value='overview'>Visao geral</TabsTab>
        <TabsTab value='tasks'>Tarefas</TabsTab>
        <TabsTab value='notes'>Notas</TabsTab>
      </TabsList>
      <TabPanels />
    </Tabs>
  ),
}

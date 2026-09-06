import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@twincam/ui/components/sidebar'
import { CircleHelpIcon, LayoutDashboardIcon, SettingsIcon, SparklesIcon } from 'lucide-react'

function SidebarExample({ collapsible }: Readonly<{ collapsible: 'icon' | 'none' | 'offcanvas' }>) {
  return (
    <SidebarProvider className='min-h-[36rem]'>
      <Sidebar collapsible={collapsible}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive size='lg' tooltip='Twincam'>
                <SparklesIcon />
                <span className='font-semibold'>Twincam</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip='Visao geral'>
                    <LayoutDashboardIcon />
                    <span>Visao geral</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled title='Disponivel em breve' tooltip='Automacoes'>
                    <SettingsIcon />
                    <span>Automacoes</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>Em breve</SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip='Ajuda'>
                <CircleHelpIcon />
                <span>Ajuda</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className='min-h-[36rem]'>
        <header className='flex h-12 items-center gap-2 border-b px-3'>
          <SidebarTrigger aria-label='Alternar sidebar' />
          <span className='font-medium text-sm'>Visao geral</span>
        </header>
        <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm'>
          Conteudo da pagina
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const meta = {
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  title: 'Foundation/Sidebar',
} satisfies Meta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

export const Offcanvas: Story = {
  render: () => <SidebarExample collapsible='offcanvas' />,
}

export const Icon: Story = {
  render: () => <SidebarExample collapsible='icon' />,
}

export const Persistent: Story = {
  render: () => <SidebarExample collapsible='none' />,
}

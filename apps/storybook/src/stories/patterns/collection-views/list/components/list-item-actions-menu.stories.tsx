import {
  ListItem,
  ListItemActionsMenu,
  ListItemBody,
  ListItemDescription,
  ListItemTitle,
  ListItemTitleTrigger,
  ListItemTrailing,
} from '@fifilo/patterns/collection-views'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

const meta = {
  args: {
    ariaLabel: 'Ações da empresa: Construtora Aurora',
    onDelete: fn(),
    onEdit: fn(),
    onOpen: fn(),
  },
  component: ListItemActionsMenu,
  parameters: {
    docs: {
      description: {
        component:
          'Menu de ações da linha da coleção: o gatilho de reticências aparece no hover e mantém a visibilidade enquanto o menu está aberto.',
      },
    },
    layout: 'centered',
  },
  render: (args) => (
    <div className='w-120'>
      <ListItem className='group'>
        <ListItemBody>
          <ListItemTitle>
            <ListItemTitleTrigger>Construtora Aurora</ListItemTitleTrigger>
          </ListItemTitle>
          <ListItemDescription>(85) 99999.0000 · **.***.***/0001-61</ListItemDescription>
        </ListItemBody>
        <ListItemTrailing>
          <ListItemActionsMenu {...args} />
        </ListItemTrailing>
      </ListItem>
    </div>
  ),
  title: 'Patterns/Collections/Views/List/Item Actions Menu',
} satisfies Meta<typeof ListItemActionsMenu>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const row = canvasElement.querySelector<HTMLElement>('[data-slot="list-item"]')
    const actions = canvas.getByRole('button', { name: 'Ações da empresa: Construtora Aurora' })
    const actionWrapper = actions.parentElement

    if (!row || !actionWrapper) throw new Error('A linha não montou as ações.')

    await expect(actionWrapper).toHaveClass('opacity-0')
    await expect(actionWrapper).toHaveClass('group-hover:opacity-100')
    await userEvent.click(actions)
    await waitFor(() => expect(actions).toHaveAttribute('data-popup-open', ''))
    await waitFor(() => expect(getComputedStyle(actionWrapper).opacity).toBe('1'))

    const menu = within(document.body)
    await expect(await menu.findByRole('menuitem', { name: 'Abrir' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Editar' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Apagar' })).toBeVisible()
    await userEvent.click(menu.getByRole('menuitem', { name: 'Editar' }))
    await expect(args.onEdit).toHaveBeenCalledTimes(1)
  },
}

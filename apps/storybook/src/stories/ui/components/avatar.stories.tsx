import { Avatar, AvatarFallback, AvatarImage } from '@fifilo/ui/components/avatar'
import type { Meta, StoryObj } from '@storybook/react-vite'

const avatarImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3Ccircle cx='32' cy='25' r='12' fill='%23f8fafc'/%3E%3Cpath d='M10 64c4-17 17-25 22-25s18 8 22 25' fill='%23f8fafc'/%3E%3C/svg%3E"

const meta = {
  component: Avatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Foundation/Avatar',
} satisfies Meta<typeof Avatar>

export default meta

type Story = StoryObj<typeof meta>

export const Image: Story = {
  render: () => (
    <Avatar className='size-14'>
      <AvatarImage alt='Marina Costa' src={avatarImage} />
      <AvatarFallback>MC</AvatarFallback>
    </Avatar>
  ),
}

export const Fallback: Story = {
  render: () => (
    <div className='flex items-center gap-3'>
      <Avatar>
        <AvatarFallback>MC</AvatarFallback>
      </Avatar>
      <Avatar className='size-10'>
        <AvatarFallback>RN</AvatarFallback>
      </Avatar>
      <Avatar className='size-12'>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
    </div>
  ),
}

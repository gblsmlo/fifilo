import { Skeleton } from '@fifilo/ui/components/skeleton'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  component: Skeleton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Feedback/Skeleton',
} satisfies Meta<typeof Skeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    className: 'h-5 w-48',
  },
}

export const ProfileCard: Story = {
  render: () => (
    <div className='w-96 space-y-4 rounded-xl border p-5'>
      <div className='flex items-center gap-3'>
        <Skeleton className='size-10 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-36' />
          <Skeleton className='h-3 w-24' />
        </div>
      </div>
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-4/5' />
      <div className='flex justify-between pt-2'>
        <Skeleton className='h-7 w-20' />
        <Skeleton className='h-7 w-24' />
      </div>
    </div>
  ),
}

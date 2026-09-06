import { Text } from '@fifilo/ui/components/text'
import type { Meta, StoryObj } from '@storybook/react-vite'

const sizes = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
] as const

const weights = [
  'thin',
  'extralight',
  'light',
  'normal',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'black',
] as const

const foregrounds = [
  'default',
  'muted',
  'destructive',
  'success',
  'warning',
  'info',
  'inherit',
] as const

const meta = {
  argTypes: {
    align: {
      control: 'select',
      options: ['left', 'center', 'right', 'justify', 'start', 'end'],
    },
    className: { control: false },
    family: {
      control: 'select',
      options: ['sans', 'heading', 'mono'],
    },
    foreground: {
      control: 'select',
      options: foregrounds,
    },
    leading: {
      control: 'select',
      options: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'],
    },
    render: { control: false },
    size: {
      control: 'select',
      options: sizes,
    },
    tracking: {
      control: 'select',
      options: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
    },
    truncate: { control: 'boolean' },
    weight: {
      control: 'select',
      options: weights,
    },
  },
  args: {
    children: 'Texto base para interfaces consistentes.',
    family: 'sans',
    foreground: 'default',
    size: 'base',
    truncate: false,
    weight: 'normal',
  },
  component: Text,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  title: 'Foundation/Text',
} satisfies Meta<typeof Text>

export default meta

type Story = StoryObj<typeof meta>

export const SizeScale: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      {sizes.map((size) => (
        <Text key={size} size={size}>
          {size} — The quick brown fox
        </Text>
      ))}
    </div>
  ),
}

export const Weights: Story = {
  render: () => (
    <div className='flex flex-col gap-3'>
      {weights.map((weight) => (
        <Text key={weight} weight={weight}>
          {weight} — Texto de interface
        </Text>
      ))}
    </div>
  ),
}

export const Foregrounds: Story = {
  render: () => (
    <div className='flex flex-col gap-3'>
      {foregrounds.map((foreground) => (
        <Text foreground={foreground} key={foreground}>
          {foreground} — Cor semântica
        </Text>
      ))}
    </div>
  ),
}

export const Families: Story = {
  render: () => (
    <div className='flex flex-col gap-3'>
      <Text family='sans'>Sans para texto de interface</Text>
      <Text family='heading' size='xl' weight='semibold'>
        Heading para títulos
      </Text>
      <Text family='mono'>Mono para conteúdo técnico</Text>
    </div>
  ),
}

export const PolymorphicHeading: Story = {
  args: {
    children: undefined,
    family: 'heading',
    render: <h2>Título renderizado como h2</h2>,
    size: '3xl',
    weight: 'semibold',
  },
}

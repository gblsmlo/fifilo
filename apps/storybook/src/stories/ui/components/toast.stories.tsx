import { Button } from '@fifilo/ui/components/button'
import { type ToastPosition, ToastProvider, toastManager } from '@fifilo/ui/components/toast'
import type { Meta, StoryObj } from '@storybook/react-vite'

const toastDetails = {
  error: {
    description: 'Tente novamente em alguns instantes.',
    title: 'Nao foi possivel salvar',
  },
  info: {
    description: 'A sincronizacao continua em segundo plano.',
    title: 'Atualizacao em andamento',
  },
  loading: {
    description: 'Estamos preparando o arquivo solicitado.',
    title: 'Gerando relatorio',
  },
  success: {
    description: 'As alteracoes ja estao disponiveis para a equipe.',
    title: 'Tarefa criada',
  },
  warning: {
    description: 'Revise os campos obrigatorios antes de continuar.',
    title: 'Informacoes pendentes',
  },
} as const

type ToastType = keyof typeof toastDetails

const toastTypes = Object.keys(toastDetails) as ToastType[]

function ToastControls({ position }: Readonly<{ position: ToastPosition }>) {
  const addToast = (type: ToastType) => {
    toastManager.add({
      id: `storybook-toast-${type}`,
      ...toastDetails[type],
      type,
    })
  }

  const addStack = () => {
    for (const type of toastTypes) addToast(type)
  }

  return (
    <ToastProvider position={position}>
      <div className='flex max-w-xl flex-wrap gap-2 p-8'>
        {toastTypes.map((type) => (
          <Button key={type} onClick={() => addToast(type)} size='sm' variant='outline'>
            {type}
          </Button>
        ))}
        <Button onClick={addStack} size='sm'>
          Mostrar pilha
        </Button>
      </div>
    </ToastProvider>
  )
}

const meta = {
  component: ToastProvider,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  title: 'Feedback/Toast',
} satisfies Meta<typeof ToastProvider>

export default meta

type Story = StoryObj<typeof meta>

export const BottomRight: Story = {
  render: () => <ToastControls position='bottom-right' />,
}

export const TopCenter: Story = {
  render: () => <ToastControls position='top-center' />,
}

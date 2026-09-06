import { StateGuard, StateSurface } from '@fifilo/patterns/state-surface'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { stateSurfaceKindArgType } from '../../test-utils/story-arg-types'

const meta = {
  args: {
    description: 'Não há registros para exibir nesta view.',
    kind: 'empty',
    title: 'Nenhum registro',
  },
  argTypes: stateSurfaceKindArgType,
  component: StateSurface,
  decorators: [
    (Story) => (
      <div className='w-full max-w-2xl p-6'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Superfície exibida no lugar dos dados. Cada kind tem ícone, tom e papel acessível próprios para que uma falha nunca seja confundida com uma lista vazia — `error`, `permission` e `integration-disconnected` são anunciados como `alert`; os demais, como `status`. `empty` é a coleção sem registro algum (a ação é criar o primeiro); `no-result` é a coleção que tem registros mas nenhum passa pelos filtros ou pela busca ativos (a ação é limpar filtros), e também o registro pedido por id que não existe nesta consulta. `loading` não é um kind: é transiente, e a composição sobre `Empty` é peso demais para o momento — ver a story `Loading`, que demonstra o tratamento dedicado do `StateGuard`.',
      },
    },
    layout: 'padded',
  },
  title: 'StateSurface',
} satisfies Meta<typeof StateSurface>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const NoResults: Story = {
  args: {
    description: 'Remova ou ajuste os filtros para ampliar a busca.',
    kind: 'no-result',
    title: 'Nenhum resultado encontrado',
  },
}

export const Loading: Story = {
  args: {},
  render: () => (
    <StateGuard
      state='loading'
      surface={{
        description: 'Aguarde enquanto os registros são carregados.',
        title: 'Carregando',
      }}
    >
      <p>Dados ainda indisponíveis</p>
    </StateGuard>
  ),
}

export const SyncPending: Story = {
  args: {
    description: 'As alterações locais aguardam sincronização com o provedor.',
    kind: 'sync-pending',
    title: 'Sincronização pendente',
  },
}

export const IntegrationDisconnected: Story = {
  args: {
    description: 'Reconecte a integração para voltar a sincronizar os dados.',
    kind: 'integration-disconnected',
    title: 'Integração desconectada',
  },
}

export const Failure: Story = {
  args: {
    actions: [{ label: 'Tentar novamente', onPress: () => undefined }],
    description: 'Não foi possível carregar os dados. Tente novamente.',
    kind: 'error',
    title: 'Falha ao carregar',
  },
}

// Sem ação de repetir, de propósito: uma tentativa não muda a autorização, e o
// botão convidaria o usuário a insistir num acesso que não tem.
export const PermissionDenied: Story = {
  args: {
    description: 'Você não tem permissão para visualizar estes registros.',
    kind: 'permission',
    title: 'Acesso restrito',
  },
}

const PROTECTED_CONTENT = 'Registro protegido'

/**
 * A garantia de `StateGuard` que os consumers dependem: em estado que nao e
 * `data`, o filho nao e apenas escondido — ele nao e montado. `tasks-collection`
 * conta com isso para nao deixar dado de tarefa no DOM em estado de permissao,
 * onde "escondido por CSS" ainda seria vazamento.
 *
 * A contagem usa `[data-protegido]`, e nao `p`: a propria `StateSurface` renderiza
 * paragrafos de titulo e descricao, entao contar `p` mediria a superficie de
 * estado em vez do filho guardado.
 */
export const Guard: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)

    await expect(screen.getByText(PROTECTED_CONTENT)).toBeInTheDocument()
    await expect(screen.queryByText('Sem permissao')).toBeNull()
    await expect(canvasElement.querySelectorAll('[data-protegido]')).toHaveLength(1)
  },
  render: () => (
    <StateGuard state='data' surface={{ description: 'Nao usado.', title: 'Nao usado.' }}>
      <p data-protegido>{PROTECTED_CONTENT}</p>
    </StateGuard>
  ),
}

export const GuardWithoutPermission: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)

    await expect(screen.getByText('Sem permissao')).toBeInTheDocument()
    // Ausente do DOM, nao invisivel: `queryByText` falharia igual para um filho
    // escondido, entao a contagem do marcador e o que separa os dois casos.
    await expect(screen.queryByText(PROTECTED_CONTENT)).toBeNull()
    await expect(canvasElement.querySelectorAll('[data-protegido]')).toHaveLength(0)
  },
  render: () => (
    <StateGuard
      state='permission'
      surface={{
        description: 'Solicite acesso ao administrador do workspace.',
        title: 'Sem permissao',
      }}
    >
      <p data-protegido>{PROTECTED_CONTENT}</p>
    </StateGuard>
  ),
}

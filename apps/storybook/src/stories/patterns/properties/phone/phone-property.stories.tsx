import { PhoneProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, screen, userEvent } from 'storybook/test'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

const PHONE = '+5511987654321'
// What the row shows: the stored number is E.164, and the reader sees the national one.
const PHONE_SHOWN = '(11) 98765.4321'
const OTHER = '+351912345678'

const meta = {
  argTypes: propertyArgTypes,
  component: PhoneProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Telefones como fileira de chips, no mesmo gatilho de `TagsProperty`: vazia, o gatilho se explica ("Adicionar telefone"); com números na fileira o contexto já está dado e sobra o `+`. A diferença para Tags é a origem do valor — tag vem de catálogo fechado e o popup é uma lista; telefone é digitado, e o popup é o `PhoneInput`, com seletor de país e formatação enquanto se digita. Formato é do campo, que carrega a biblioteca que valida; `errorMessage` fica para a recusa do consumidor — duplicata no workspace, unicidade, papel.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Properties/Phone',
} satisfies Meta<typeof PhoneProperty>

export default meta

type Story = StoryObj<typeof PhoneProperty>

function PhoneField({ initial = [] as string[], ...props }) {
  const [value, setValue] = useState<readonly string[]>(initial)
  return <PhoneProperty {...props} onValueChange={setValue} value={value} />
}

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sem número nenhum o gatilho é o único conteúdo da fileira. Se fosse só um `+`, o estado inicial não teria afordância nenhuma.',
      },
    },
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'Adicionar telefone' })
    await expect(trigger.textContent).toContain('Sem telefone')
  },
  render: () => <PhoneField />,
}

export const WithPhones: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Com números na fileira o rótulo sai do texto e vira nome acessível: o contexto já está dado pelos chips ao lado, e repetir a palavra por número seria ruído. O gatilho fica no mesmo quadrado de 24px do `TagsProperty`.',
      },
    },
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'Adicionar telefone' })
    await expect(trigger.textContent).toBe('')

    const measured = trigger.getBoundingClientRect()
    await expect(measured.width).toBe(24)
    await expect(measured.height).toBe(24)
  },
  render: () => <PhoneField initial={[PHONE, OTHER]} />,
}

export const Adding: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'O popup é o `PhoneInput`: seletor de país e formatação no padrão do país enquanto se digita. Submeter um número incompleto não vai ao servidor — a mesma biblioteca que formata sabe recusar, e a mensagem fica junto do campo.',
      },
    },
  },
  play: async ({ canvas, step }) => {
    await step('número incompleto é recusado no próprio campo', async () => {
      await userEvent.click(await canvas.findByRole('button', { name: 'Adicionar telefone' }))
      const field = await screen.findByRole('textbox', { name: 'Principal' })
      await userEvent.type(field, '11987')
      // With no button in the popup, `Enter` in the field is what confirms.
      await userEvent.keyboard('{Enter}')
      await expect(await screen.findByRole('alert')).toBeTruthy()
    })
  },
  render: () => <PhoneField initial={[PHONE]} />,
}

export const PersistentTrigger: Story = {
  args: { display: 'trigger' },
  parameters: {
    docs: {
      description: {
        story:
          'Com `display="trigger"` a fileira não vira chips: um gatilho só, que segue nomeando a propriedade mesmo preenchida, e abre o popup para acrescentar, editar ou remover. Serve à linha onde duas fileiras vizinhas colapsariam em dois `+` indistinguíveis.',
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Adicionar telefone' })).toBeNull()
    await expect(
      (await canvas.findByRole('button', { name: /Telefones: / })).textContent,
    ).toContain('+1')
  },
  render: () => <PhoneField display='trigger' initial={[PHONE, OTHER]} />,
}

export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sem ação a fileira não oferece nem adicionar nem remover — o chip de quem só pode ler. Vazia, ela declara a ausência em vez de ficar em branco.',
      },
    },
  },
  render: () => (
    <div className='flex flex-col gap-3'>
      <PhoneProperty value={[PHONE, OTHER]} />
      <PhoneProperty value={[]} />
    </div>
  ),
}

export const AddDisabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`addDisabled` fecha só o caminho de adição, sem tornar a fileira somente leitura: o número existente continua removível. É o caso do contrato que guarda um número principal — com ele preenchido, não há segundo a adicionar, e um `+` prometeria o que a escrita recusaria.',
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Adicionar telefone' })).toBe(null)
    await expect(
      await canvas.findByRole('button', { name: `Remover telefone ${PHONE_SHOWN}` }),
    ).toBeTruthy()
  },
  render: () => <PhoneField addDisabled initial={[PHONE]} />,
}

export const WithRejection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Formato o campo resolve sozinho. `errorMessage` é para o que só o consumidor sabe — unicidade no workspace, papel, duplicata —, e aparece no mesmo lugar.',
      },
    },
  },
  render: () => <PhoneField errorMessage='Já existe outro contato com este telefone.' />,
}

export const InLabeledRow: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Numa fileira que já tem coluna de rótulo, `showIcon={false}` tira o ícone de tipo — dizer o nome da propriedade duas vezes na mesma linha não acrescenta. É a configuração da ficha: `readOnly`, porque escrever é pelo diálogo do `...`, e `copyLabel` com `trailingVisibility` em `hover`, que guarda a cópia até o ponteiro chegar sem deixar a fileira saltar.',
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('.lucide-phone')).toBe(null)
    await expect(
      canvas.getByRole('button', { name: `Copiar o telefone ${PHONE_SHOWN}` }),
    ).toBeTruthy()

    // Copy waits for the pointer, and its space stays reserved: the row does not
    // jump when it appears. The reveal itself is checked in the browser — CSS
    // `:hover` does not answer a synthetic event.
    const affordance = canvasElement.querySelector<HTMLElement>('[data-slot="property-trailing"]')
    await expect(affordance).not.toBeNull()
    if (!affordance) return
    await expect(getComputedStyle(affordance).opacity).toBe('0')
    await expect(affordance.getBoundingClientRect().width).toBeGreaterThan(0)
  },
  render: () => (
    <PhoneField
      copyLabel={(phone: string) => `Copiar o telefone ${phone}`}
      initial={[PHONE]}
      readOnly
      showIcon={false}
      trailingVisibility='hover'
      variant='plain'
    />
  ),
}

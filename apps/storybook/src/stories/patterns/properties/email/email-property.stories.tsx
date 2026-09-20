import { EmailProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, screen, userEvent } from 'storybook/test'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

const EMAIL = 'ana.souza@fifilo.test'
const OTHER = 'bruno.lima@fifilo.test'

const meta = {
  argTypes: propertyArgTypes,
  component: EmailProperty,
  parameters: {
    docs: {
      description: {
        component:
          'E-mails como fileira de chips, na mesma anatomia de `PhoneProperty`: vazia, o gatilho se explica ("Adicionar e-mail"); com endereços na fileira o contexto já está dado e sobra o `+`. O que muda em relação ao telefone é só a entrada — não há país nem formatação a aplicar —, e por isso ela tem duas formas: `popover` abre um campo sobre o gatilho, e `inline` troca o próprio gatilho por um `EditableText`. Formato é do campo; `errorMessage` fica para a recusa do consumidor — duplicata no workspace, unicidade, domínio corporativo.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Properties/Email',
} satisfies Meta<typeof EmailProperty>

export default meta

type Story = StoryObj<typeof EmailProperty>

function EmailField({ initial = [] as string[], ...props }) {
  const [value, setValue] = useState<readonly string[]>(initial)
  return <EmailProperty {...props} onValueChange={setValue} value={value} />
}

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sem endereço nenhum o gatilho é o único conteúdo da fileira. Se fosse só um `+`, o estado inicial não teria afordância nenhuma.',
      },
    },
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'Adicionar e-mail' })

    await expect(trigger.textContent).toContain('Sem e-mail')
  },
  render: () => <EmailField />,
}

export const WithEmails: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Com endereços na fileira o rótulo sai do texto e vira nome acessível: o contexto já está dado pelos chips ao lado, e repetir a palavra por endereço seria ruído.',
      },
    },
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'Adicionar e-mail' })

    await expect(trigger.textContent).toBe('')
    await expect(canvas.getByText(EMAIL)).toBeTruthy()
  },
  render: () => <EmailField initial={[EMAIL, OTHER]} />,
}

export const Adding: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'O popup é um campo de e-mail, e `Enter` confirma. Endereço malformado não vai ao servidor — a recusa fica junto do campo.',
      },
    },
  },
  play: async ({ canvas, step }) => {
    await step('e-mail malformado é recusado no próprio campo', async () => {
      await userEvent.click(await canvas.findByRole('button', { name: 'Adicionar e-mail' }))
      const field = await screen.findByRole('textbox', { name: 'Principal' })
      await userEvent.type(field, 'ana@{Enter}')

      await expect((await screen.findByRole('alert')).textContent).toContain('e-mail válido')
    })
  },
  render: () => <EmailField />,
}

export const InlineEditing: Story = {
  args: { editing: 'inline' },
  parameters: {
    docs: {
      description: {
        story:
          'Com `editing="inline"` o gatilho não abre popup: ele dá lugar a um `EditableText` na própria fileira, que comita no `blur`. Serve à superfície que guarda um endereço só e não quer tirar a pessoa da linha.',
      },
    },
  },
  play: async ({ canvas, step }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Adicionar e-mail' }))
    const field = await canvas.findByRole('textbox', { name: 'Adicionar e-mail' })

    await expect(field.getAttribute('data-slot')).toBe('editable-text')
    await expect(screen.queryByRole('dialog')).toBeNull()

    await step('formato recusado mantém o campo aberto com a mensagem', async () => {
      await userEvent.type(field, 'ana@')
      await userEvent.tab()

      await expect((await canvas.findByRole('alert')).textContent).toContain('e-mail válido')
      await expect(
        (canvas.getByRole('textbox', { name: 'Adicionar e-mail' }) as HTMLInputElement).value,
      ).toBe('ana@')
    })
  },
  render: () => <EmailField editing='inline' />,
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
    await expect(canvas.queryByRole('button', { name: 'Adicionar e-mail' })).toBeNull()
    await expect((await canvas.findByRole('button', { name: /E-mails: / })).textContent).toContain(
      '+1',
    )
  },
  render: () => <EmailField display='trigger' initial={[EMAIL, OTHER]} />,
}

export const ReadOnly: Story = {
  args: { readOnly: true },
  parameters: {
    docs: {
      description: {
        story: 'Somente leitura: os endereços aparecem sem gatilho de adição nem de remoção.',
      },
    },
  },
  render: () => <EmailField initial={[EMAIL]} readOnly />,
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
    await expect(canvasElement.querySelector('.lucide-mail')).toBe(null)
    await expect(canvas.getByRole('button', { name: `Copiar o e-mail ${EMAIL}` })).toBeTruthy()

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
    <EmailField
      copyLabel={(email: string) => `Copiar o e-mail ${email}`}
      initial={[EMAIL]}
      readOnly
      showIcon={false}
      trailingVisibility='hover'
      variant='plain'
    />
  ),
}

import { DocumentProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { IdCardIcon } from 'lucide-react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { propertyVariantArgType } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: propertyVariantArgType,
  component: DocumentProperty,
  parameters: {
    docs: {
      description: {
        component:
          'CPF e CNPJ como property. A pontuação entra enquanto se digita, o número que não é o documento esperado é recusado na própria fileira, e o rótulo vem do `kind` — nenhum consumidor reescreve máscara, espaço reservado ou recusa.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Document',
} satisfies Meta<typeof DocumentProperty>

export default meta

type Story = StoryObj<typeof DocumentProperty>

export const Default: Story = {
  args: {
    ariaLabel: 'CPF',
    icon: IdCardIcon,
    kind: 'cpf',
    value: '529.982.247-25',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('529.982.247-25')).toBeVisible()
  },
}

export const Empty: Story = {
  args: {
    ariaLabel: 'CNPJ',
    icon: IdCardIcon,
    kind: 'cnpj',
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Sem valor e sem escrita, a fileira declara a ausência com o nome do documento.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const surface = canvasElement.querySelector<HTMLElement>('[data-slot="property-surface"]')

    await expect(within(canvasElement).getByText('Sem CNPJ')).toBeVisible()
    await expect(surface?.dataset.empty).toBe('true')
  },
}

export const Editable: Story = {
  args: {
    ariaLabel: 'CPF',
    icon: IdCardIcon,
    kind: 'cpf',
    onCommit: fn(),
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A escrita nasce na property: o gatilho abre o campo no lugar, a pontuação entra a cada tecla, e o commit é no `blur`, contrato de `EditableText`.',
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Adicionar CPF' }))
    const field = await canvas.findByRole<HTMLInputElement>('textbox', { name: 'CPF' })

    await expect(field.placeholder).toBe('000.000.000-00')

    await userEvent.type(field, '52998224725')
    // Punctuation belongs to the property: typing only the digits shows a formatted CPF.
    await expect(field.value).toBe('529.982.247-25')

    await userEvent.tab()
    await waitFor(() => expect(args.onCommit).toHaveBeenCalledWith('529.982.247-25'))
  },
}

export const RefusesTheOtherDocument: Story = {
  args: {
    ariaLabel: 'CPF',
    icon: IdCardIcon,
    kind: 'cpf',
    onCommit: fn(),
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'O `kind` julga o número: um CNPJ digitado numa fileira de CPF é recusado na própria fileira, e a escrita não sobe.',
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Adicionar CPF' }))
    const field = await canvas.findByRole<HTMLInputElement>('textbox', { name: 'CPF' })

    await userEvent.type(field, '11222333000181')
    await userEvent.tab()

    await waitFor(() =>
      expect(canvas.getByRole('alert').textContent).toBe('Informe um CPF válido.'),
    )
    await expect(args.onCommit).not.toHaveBeenCalled()
    // The refused number stays in the field, which stays open: correcting the
    // entry is not retyping the whole thing.
    await expect(field.value).toBe('11.222.333/0001-81')
  },
}

export const RedactedValue: Story = {
  args: {
    ariaLabel: 'CPF do contato',
    icon: IdCardIcon,
    kind: 'cpf',
    onCommit: fn(),
    value: '•••.•••.•••-09',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A leitura devolve o número redigido: ele diz qual documento está guardado sem ser um número que se reenvie. Ele abre dentro do campo — é o que deixa apagá-lo — e não passa pela recusa, então sair sem mexer não escreve nada.',
      },
    },
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'CPF do contato: •••.•••.•••-09' }))
    const field = await canvas.findByRole<HTMLInputElement>('textbox', { name: 'CPF do contato' })

    // The redacted value opens inside the field — that is what allows erasing it —
    // but it is not a document, so leaving without touching it writes nothing.
    await expect(field.value).toBe('•••.•••.•••-09')

    await userEvent.tab()
    await expect(args.onCommit).not.toHaveBeenCalled()
    // And the row goes back to reading, instead of leaving a field open in place of the value.
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'CPF do contato: •••.•••.•••-09' })).toBeVisible(),
    )
  },
}

export const ClearingRemovesTheDocument: Story = {
  args: {
    ariaLabel: 'CPF do contato',
    icon: IdCardIcon,
    kind: 'cpf',
    onCommit: fn(),
    value: '•••.•••.•••-09',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Esvaziar o campo apaga o documento do registro. É o caminho que o campo aberto vazio fecharia: sem o valor lido dentro dele, apagar seria indistinguível de abrir e não escrever.',
      },
    },
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'CPF do contato: •••.•••.•••-09' }))
    const field = await canvas.findByRole<HTMLInputElement>('textbox', { name: 'CPF do contato' })

    await userEvent.clear(field)
    await userEvent.tab()

    await waitFor(() => expect(args.onCommit).toHaveBeenCalledWith(null))
  },
}

export const FieldKeepsTheRowWidth: Story = {
  args: {
    ariaLabel: 'CNPJ da empresa',
    copyLabel: 'Copiar o CNPJ',
    icon: IdCardIcon,
    kind: 'cnpj',
    onCommit: fn(),
    value: '11.222.333/0001-81',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Abrir o campo não mexe na largura da fileira. Um `input` mede vinte caracteres por conta própria, e a superfície saltava ao entrar em edição, empurrando a cópia para longe do número — a fileira ficava diferente da de telefone, que edita em popup e nunca cresce.',
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const surface = canvasElement.querySelector<HTMLElement>('[data-slot="property-surface"]')
    await expect(surface).not.toBeNull()
    if (!surface) return

    const closed = surface.getBoundingClientRect().width

    await userEvent.click(
      canvas.getByRole('button', { name: 'CNPJ da empresa: 11.222.333/0001-81' }),
    )
    await canvas.findByRole('textbox', { name: 'CNPJ da empresa' })

    await waitFor(() => expect(surface.getBoundingClientRect().width).toBeCloseTo(closed, 0))
  },
}

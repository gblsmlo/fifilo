import { SelectProperty, type SelectPropertyOption } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleDotIcon, MailIcon, PhoneIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import {
  expectAbsenceTone,
  expectBadgeSurface,
  expectPlainSurface,
} from '../../../../test-utils/property-surface'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

const meeting: SelectPropertyOption = {
  icon: UsersIcon,
  label: 'Reunião',
  tone: 'info',
  value: 'meeting',
}
const call: SelectPropertyOption = {
  icon: PhoneIcon,
  label: 'Ligação',
  tone: 'success',
  value: 'call',
}
const email: SelectPropertyOption = {
  icon: MailIcon,
  label: 'E-mail',
  tone: 'neutral',
  value: 'email',
}
const other: SelectPropertyOption = {
  icon: CircleDotIcon,
  label: 'Outro',
  tone: 'neutral',
  value: 'other',
}

const options: SelectPropertyOption[] = [meeting, call, email, other]

const optionsWithoutIcon: SelectPropertyOption[] = options.map(({ label, value }) => ({
  label,
  value,
}))

const meta = {
  argTypes: {
    ...propertyArgTypes,
    value: { control: 'select', options: options.map((option) => option.value) },
  },
  args: { ariaLabel: 'Tipo', options: options },
  component: SelectProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Propriedade de catálogo fechado definido pelo consumer. `Status` e `Prioridade` trazem o próprio vocabulário porque ele é delas; aqui as opções vêm de fora, para o pattern servir qualquer enumeração de domínio sem carregá-la (Decisão 030). Ícone e tom são opcionais por opção, e `ariaLabel` é obrigatório — sem domínio próprio não há rótulo a derivar.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Select',
} satisfies Meta<typeof SelectProperty>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { placeholder: 'Tipo', readOnly: true, value: null },
  parameters: {
    docs: {
      description: {
        story:
          'Sem valor na origem a superfície mostra o `placeholder` em tom secundário e emite `data-empty="true"`. É o estado de partida de uma fileira de propriedades: o que foi preenchido se distingue de relance do que não.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
    await expectAbsenceTone(canvasElement)
  },
}

export const ComValor: Story = {
  args: { readOnly: true, value: meeting.value },
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
}

export const Plain: Story = {
  args: { readOnly: true, value: meeting.value, variant: 'plain' },
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
}

export const SemIcone: Story = {
  args: { options: optionsWithoutIcon, readOnly: true, value: call.value },
}

export const ForaDoCatalogo: Story = {
  args: { fallback: 'Não informado', readOnly: true, value: 'inexistente' },
}

export const Dropdown: Story = {
  args: { value: meeting.value },
  render: (args) => <SelectDropdownExample {...args} />,
}

export const LimparValor: Story = {
  ...Dropdown,
  args: { ...Dropdown.args, emptyOptionLabel: 'Sem tipo', placeholder: 'Tipo' },
}

export const Agrupado: Story = {
  ...Dropdown,
  args: {
    ariaLabel: 'Modelo',
    emptyOptionLabel: 'Sem modelo',
    groups: [
      { label: 'Presencial', options: [meeting] },
      { label: 'Contato remoto', options: [call, email] },
      { label: 'Outros', options: [other] },
    ],
    options: undefined,
    placeholder: 'Sem modelo',
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Com `groups` o catálogo chega repartido em seções nomeadas, para a lista que precisa dizer de onde as opções vêm. `options` e `groups` são exclusivos — o catálogo é plano ou repartido, nunca os dois. A opção de valor ausente fica fora das seções, porque não pertence a nenhuma.',
      },
    },
  },
}

export const ComBusca: Story = {
  ...Dropdown,
  args: {
    ...Dropdown.args,
    emptyOptionLabel: 'Sem tipo',
    footerAction: { disabled: true, label: 'Adicionar novo' },
    searchEmptyLabel: 'Nenhum tipo encontrado.',
    searchPlaceholder: 'Buscar tipo…',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Com `searchPlaceholder` o popup ganha busca, para o catálogo que não se lê de uma vez. `footerAction` fecha a lista com um comando que alcança o que o catálogo ainda não tem — desligado enquanto a capacidade não existe, porque um comando que não faz nada é pior que nenhum. A ação não é opção: não entra na busca nem vira valor.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('combobox')
    await userEvent.click(trigger)

    const popup = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[data-slot="combobox-popup"]')
      if (!found) throw new Error('o popup nao abriu')
      return found
    })

    const search = within(popup).getByPlaceholderText('Buscar tipo…')
    const add = within(popup).getByRole('button', { name: 'Adicionar novo' })
    await expect(add).toBeDisabled()

    await expect(within(popup).getAllByRole('option')).toHaveLength(5)
    await userEvent.type(search, 'lig')
    await waitFor(async () => {
      await expect(
        within(popup)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Ligação'])
    })

    // The footer command survives the filter: it is not an option in the list.
    await expect(within(popup).getByRole('button', { name: 'Adicionar novo' })).toBeInTheDocument()
  },
  tags: ['storybook-test'],
}

export const Disabled: Story = {
  args: { disabled: true, value: other.value, onValueChange: () => undefined },
}

function SelectDropdownExample({
  value: valorInicial,
  ...args
}: React.ComponentProps<typeof SelectProperty>) {
  const [value, setValue] = useState<string | null>(valorInicial)

  return <SelectProperty {...args} onValueChange={setValue} value={value} />
}

import { AddressProperty, type AddressValue } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, screen, userEvent } from 'storybook/test'
import { propertyArgTypes } from '../../../../test-utils/story-arg-types'

const ADDRESS: AddressValue = {
  city: 'Fortaleza',
  complement: null,
  district: 'Aldeota',
  number: '1200',
  postalCode: '60150-160',
  state: 'CE',
  street: 'Avenida Dom Luís',
}

const meta = {
  argTypes: propertyArgTypes,
  component: AddressProperty,
  parameters: {
    docs: {
      description: {
        component:
          'O endereço do cadastro numa fileira só: ela lê o resumo — cidade e UF, que é o que identifica o registro batendo o olho — e a edição abre um popup com as sete partes. Cada parte é opcional, inclusive o conjunto, e o popup recusa apenas o formato que o país define: CEP e UF. Logradouro, número, complemento e bairro não têm forma canônica, e exigir uma recusaria endereço legítimo.',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Patterns/Properties/Address',
} satisfies Meta<typeof AddressProperty>

export default meta

type Story = StoryObj<typeof AddressProperty>

function AddressField({ initial = null as AddressValue | null, ...props }) {
  const [value, setValue] = useState<AddressValue | null>(initial)
  return <AddressProperty {...props} onValueChange={setValue} value={value} />
}

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sem endereço, o gatilho diz a ausência e se explica no nome acessível. A fileira não parece um formulário em branco esperando digitação.',
      },
    },
  },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: 'Adicionar endereço' })
    await expect(trigger.textContent).toContain('Sem endereço')
  },
  render: () => <AddressField />,
}

export const WithAddress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Com endereço, a fileira lê cidade e UF, e o endereço inteiro fica a um clique. O nome acessível carrega o resumo, para quem navega por leitor de tela não precisar abrir o popup para saber o que há ali.',
      },
    },
  },
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Endereço: Fortaleza, CE' })
  },
  render: () => <AddressField initial={ADDRESS} />,
}

export const PartialAddress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Cadastro que só sabe a cidade grava a cidade: o popup salva sem exigir o resto, e o resumo continua legível.',
      },
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Adicionar endereço' }))

    await userEvent.type(await screen.findByLabelText('Cidade'), 'Sobral')
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))

    await canvas.findByRole('button', { name: 'Endereço: Sobral' })
  },
  render: () => <AddressField />,
}

export const MultiWordFields: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Logradouro, bairro e cidade são texto livre, e texto livre tem espaço: o campo guarda o que foi digitado e apara uma vez só, ao salvar. Um `trim` por tecla comeria o espaço antes da próxima letra e gravaria "AvenidaDomLuís".',
      },
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Adicionar endereço' }))

    await userEvent.type(await screen.findByLabelText('Logradouro'), 'Avenida Dom Luís')
    await userEvent.type(await screen.findByLabelText('Cidade'), 'Rio de Janeiro')
    await expect(await screen.findByLabelText('Logradouro')).toHaveValue('Avenida Dom Luís')

    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))

    await canvas.findByRole('button', { name: 'Endereço: Rio de Janeiro' })
  },
  render: () => <AddressField />,
}

export const RefusedFormat: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'CEP e UF são os dois pedaços que o país define, e o popup recusa o que não bate antes de escrever. A recusa fica junto do campo, e o popup não fecha.',
      },
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Adicionar endereço' }))

    await userEvent.type(await screen.findByLabelText('CEP'), '6015016')
    await userEvent.type(await screen.findByLabelText('UF'), 'XX')
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar' }))

    await expect(await screen.findByText('Informe um CEP válido.')).toBeVisible()
    await expect(await screen.findByText('Informe uma UF válida.')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^Endereço:/ })).toBeNull()
  },
  render: () => <AddressField />,
}

export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Quem não pode escrever o registro lê o mesmo resumo, sem gatilho: leitura continua sendo leitura.',
      },
    },
  },
  play: async ({ canvas }) => {
    await canvas.findByText('Fortaleza, CE')
    await expect(canvas.queryByRole('button')).toBeNull()
  },
  render: () => <AddressProperty value={ADDRESS} />,
}

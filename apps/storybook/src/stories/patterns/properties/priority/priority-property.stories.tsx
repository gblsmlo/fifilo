import { PriorityProperty, type PriorityPropertyValue } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, within } from 'storybook/test'
import { enforceColorContrast } from '../../../../test-utils/a11y'
import {
  GRAPHIC_CONTRAST_FLOOR,
  computedTokenColor,
  measureIconContrast,
} from '../../../../test-utils/contrast'
import {
  expectAbsenceTone,
  expectBadgeSurface,
  expectPlainSurface,
} from '../../../../test-utils/property-surface'
import { booleanArgType, propertyArgTypes } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: {
    ...propertyArgTypes,
    hideLabel: booleanArgType,
    includeNoPriority: booleanArgType,
    value: {
      control: 'select',
      options: ['no_priority', 'urgent', 'high', 'medium', 'low'],
    },
  },
  component: PriorityProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Unidade determinística de propriedade de prioridade: No priority, Urgent, High, Medium e Low. Badge é a superfície padrão; plain remove o tratamento de badge sem transferir ícone, label ou tom ao consumer.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Priority',
} satisfies Meta<typeof PriorityProperty>

export default meta

type Story = StoryObj<typeof PriorityProperty>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
  args: {
    readOnly: true,
    value: 'high',
  },
}

export const SemValor: Story = {
  args: {
    ariaLabel: 'Prioridade',
    readOnly: true,
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sem prioridade na origem a superfície mostra o preset de repouso em tom secundário e emite `data-empty="true"`.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expectAbsenceTone(canvasElement)
  },
}

export const SemPrioridadeGravada: Story = {
  args: {
    readOnly: true,
    value: 'no_priority',
  },
  parameters: {
    docs: {
      description: {
        story:
          'O par que distingue o contrato: `no_priority` gravada usa o mesmo preset da story acima e permanece em tom de valor, sem `data-empty`. A ausência se mede na fonte, não no preset resolvido.',
      },
    },
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
  args: {
    readOnly: true,
    value: 'high',
    variant: 'plain',
  },
}

export const Trigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Caso de uso editável: o badge de prioridade funciona como trigger e abre a lista determinística em SelectPopup. O consumer controla a posição com dropdownPlacement.',
      },
    },
  },
  render: () => <PriorityDropdownExample />,
}

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'medium',
    onValueChange: () => undefined,
  },
}

/**
 * `hideLabel` some com o rótulo da tela sem tirá-lo da árvore de acessibilidade.
 * As duas metades são fato de navegador: geometria renderizada e nome acessível.
 * A estrutura do DOM que produz isso é afirmada em `bun test`, no pacote.
 */
export const IconOnly: Story = {
  args: {
    hideLabel: true,
    readOnly: true,
    value: 'urgent',
  },
  play: async ({ canvasElement }) => {
    const label = await within(canvasElement).findByText('Urgente')

    // Clipped to a single pixel: it leaves the screen without leaving the tree.
    await expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1)
    await expect(canvasElement.querySelector('[data-slot="property-surface"]')).toHaveTextContent(
      'Urgente',
    )
  },
}

/**
 * O caminho que a Lista de fato toma quando a edição inline está ligada: aqui a
 * superfície é um gatilho de Select, e o nome acessível vem do `aria-label` dele,
 * não do texto recortado.
 */
export const IconOnlyTrigger: Story = {
  args: {
    ariaLabel: 'Prioridade',
    hideLabel: true,
    value: 'urgent',
    onValueChange: () => undefined,
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('combobox')

    await expect(trigger).toHaveAccessibleName('Prioridade: Urgente')
    await expect(trigger.querySelector('svg')).toBeTruthy()
  },
}

/**
 * O tom do ícone sai dos tokens de tema, então o mesmo valor tem cor diferente no
 * claro e no escuro.
 *
 * A medição é feita à mão de propósito. O `color-contrast` do axe sai cedo em
 * elemento sem filho de texto real, e o tom vive num `<svg aria-hidden>` — ligar
 * a regra e trocar o tom por um ilegível deixa a story verde. A regra continua
 * ligada porque cobre o rótulo, que é a outra metade da superfície.
 */
export const ContrastDark: Story = {
  args: { readOnly: true, value: 'urgent' },
  globals: { theme: 'dark' },
  parameters: { a11y: enforceColorContrast() },
  play: async ({ canvasElement }) => {
    const { color } = measureIconContrast(canvasElement)

    await expect(color).toBe(computedTokenColor('--destructive-foreground'))
  },
}

export const ContrastLight: Story = {
  args: { readOnly: true, value: 'urgent' },
  globals: { theme: 'light' },
  parameters: { a11y: enforceColorContrast() },
  play: async ({ canvasElement }) => {
    const { color } = measureIconContrast(canvasElement)

    await expect(color).toBe(computedTokenColor('--destructive-foreground'))
  },
}

/**
 * O caminho que a Lista toma: sem rótulo e sem cromo de insígnia, o ícone é o
 * único portador na tela, então aqui vale o piso de 3:1 de objeto gráfico
 * (WCAG 1.4.11). É `plain` justamente porque o fundo da insígnia clareia o
 * suficiente para o tom escuro não alcançar o piso.
 */
export const IconOnlyContrastDark: Story = {
  args: { hideLabel: true, readOnly: true, value: 'urgent', variant: 'plain' },
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expect(measureIconContrast(canvasElement).ratio).toBeGreaterThanOrEqual(
      GRAPHIC_CONTRAST_FLOOR,
    )
  },
}

export const IconOnlyContrastLight: Story = {
  args: { hideLabel: true, readOnly: true, value: 'urgent', variant: 'plain' },
  globals: { theme: 'light' },
  play: async ({ canvasElement }) => {
    await expect(measureIconContrast(canvasElement).ratio).toBeGreaterThanOrEqual(
      GRAPHIC_CONTRAST_FLOOR,
    )
  },
}

function PriorityDropdownExample() {
  const [value, setValue] = useState<PriorityPropertyValue>('high')

  return (
    <div className='p-4'>
      <PriorityProperty ariaLabel='Prioridade' value={value} onValueChange={setValue} />
    </div>
  )
}

import { TextProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GlobeIcon, ShapesIcon } from 'lucide-react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { expectBadgeSurface, expectPlainSurface } from '../../../../test-utils/property-surface'
import { propertyVariantArgType } from '../../../../test-utils/story-arg-types'

const meta = {
  argTypes: propertyVariantArgType,
  component: TextProperty,
  parameters: {
    docs: {
      description: {
        component:
          'Generic text property unit for simple values such as type, source, category, area, or origin. Valor com formato próprio — telefone, e-mail, documento — tem a sua própria property, que conhece a máscara e a recusa.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Text',
} satisfies Meta<typeof TextProperty>

export default meta

type Story = StoryObj<typeof TextProperty>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectBadgeSurface(canvasElement)
  },
  args: {
    ariaLabel: 'Type',
    icon: ShapesIcon,
    value: 'Document request',
  },
}

export const Plain: Story = {
  play: async ({ canvasElement }) => {
    await expectPlainSurface(canvasElement)
  },
  args: {
    ariaLabel: 'Type',
    icon: ShapesIcon,
    value: 'Document request',
    variant: 'plain',
  },
}

export const WithCopy: Story = {
  args: {
    ariaLabel: 'Category',
    copyLabel: 'Copiar a categoria do registro',
    icon: ShapesIcon,
    value: 'Contencioso trabalhista',
  },
  parameters: {
    docs: {
      description: {
        story:
          '`copyLabel` acende a afordância de cópia à direita do valor, na mesma anatomia do `×` de `AttachmentProperty`: um ícone dentro da própria superfície, não um controle ao lado dela. Copiar é caminho secundário, então ela espera o ponteiro — e o espaço dela continua reservado, para a fileira não saltar. A escrita na área de transferência é da property; ao consumidor cabe nomear o que está sendo copiado.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const surface = canvasElement.querySelector<HTMLElement>('[data-slot="property-surface"]')
    const copyButton = canvas.getByRole('button', { name: 'Copiar a categoria do registro' })
    const affordance = canvasElement.querySelector<HTMLElement>('[data-slot="property-trailing"]')

    await expect(affordance).not.toBeNull()
    if (!affordance) return

    await expect(getComputedStyle(affordance).opacity).toBe('0')
    await expect(affordance.getBoundingClientRect().width).toBeGreaterThan(0)

    // The keyboard path is what this story protects. The pointer path does not
    // fit here: `userEvent.hover` dispatches a synthetic event, and CSS `:hover`
    // only answers a real pointer — the hover reveal is checked in the browser.
    copyButton.focus()
    await waitFor(() => expect(getComputedStyle(affordance).opacity).toBe('1'))

    // A child of `img` is presentational: if the surface became an `img`, the
    // button would leave the accessibility tree while still being in the DOM.
    // `getByRole` alone does not catch that — hence the surface role is asserted here.
    await expect(surface?.getAttribute('role')).not.toBe('img')
    await expect(surface?.getAttribute('role')).toBe('group')
  },
}

export const WithCopyAlways: Story = {
  args: {
    ariaLabel: 'Category',
    copyLabel: 'Copiar a categoria do registro',
    trailingVisibility: 'always',
    icon: ShapesIcon,
    value: 'Contencioso trabalhista',
  },
  parameters: {
    docs: {
      description: {
        story:
          "`trailingVisibility='always'` desfaz a espera pelo ponteiro. Serve à superfície que não tem hover a oferecer — um toque, uma leitura impressa — e ao caso em que copiar é o comando principal da fileira, não o segundo caminho.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: 'Copiar a categoria do registro' }),
    ).toBeVisible()
  },
}

export const Empty: Story = {
  args: {
    ariaLabel: 'Category',
    copyLabel: 'Copy category',
    fallback: 'No category',
    icon: ShapesIcon,
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sem valor, a cópia não aparece mesmo pedida: copiar o texto de ausência entregaria "No category" à área de transferência.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const surface = canvasElement.querySelector<HTMLElement>('[data-slot="property-surface"]')

    await expect(canvasElement.querySelector('[data-slot="property-copy"]')).toBeNull()
    // Absence falls back to the placeholder tone: without it the fallback reads
    // with the same weight as a filled value.
    await expect(surface?.dataset.empty).toBe('true')
  },
}

export const EmptyWithTrigger: Story = {
  args: {
    ariaLabel: 'Área',
    fallback: 'Sem área',
    icon: ShapesIcon,
    inputPlaceholder: 'Trabalhista, tributário, cível…',
    onCommit: fn(),
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Vazia e editável, a property oferece o preenchimento em vez de só declarar a ausência — é a mesma anatomia do `+` de `TagsProperty`. Clicar troca o gatilho pelo campo, no lugar.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'Sem área' }))
    const field = await canvas.findByRole<HTMLInputElement>('textbox', { name: 'Área' })

    await expect(field).toBeVisible()
    // The trigger said there is no value; the field teaches how the value is written.
    await expect(field.placeholder).toBe('Trabalhista, tributário, cível…')
  },
}

export const EditableInline: Story = {
  args: {
    ariaLabel: 'Área',
    editing: 'inline',
    fallback: 'Sem área',
    icon: ShapesIcon,
    onCommit: fn(),
    value: 'Trabalhista',
  },
  parameters: {
    docs: {
      description: {
        story:
          'O campo ocupa o lugar do valor desde o início: clicar já é escrever, sem gatilho intermediário. Serve à unidade que é vitrine de um cadastro, onde a fileira existe para ser preenchida. O commit é no `blur`, contrato de `EditableText`.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox', { name: 'Área' })

    await userEvent.clear(field)
    await userEvent.type(field, 'Tributário')
    await userEvent.tab()

    await waitFor(() => expect(args.onCommit).toHaveBeenCalledWith('Tributário'))
  },
}

export const WithLink: Story = {
  args: {
    ariaLabel: 'Domínio',
    copyLabel: 'Copiar o domínio',
    href: 'https://exemplo.com.br',
    icon: GlobeIcon,
    linkLabel: 'Abrir exemplo.com.br',
    value: 'exemplo.com.br',
    variant: 'plain',
  },
  parameters: {
    docs: {
      description: {
        story:
          '`href` acende a afordância de abrir o destino em outra aba, no mesmo canto da cópia. Vindo os dois, abrir fica antes de copiar: é o que se faz com um endereço, e copiar é o segundo caminho.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole('link', { name: 'Abrir exemplo.com.br' })

    await expect(link).toHaveAttribute('href', 'https://exemplo.com.br')
    // An external destination in a new tab does not lend this one's session:
    // `noreferrer` cuts `window.opener` and the origin header.
    await expect(link).toHaveAttribute('rel', 'noreferrer')
    await expect(canvas.getByRole('button', { name: 'Copiar o domínio' })).toBeTruthy()

    // Opening comes before copying: it is what one does with an address.
    const affordance = canvasElement.querySelector<HTMLElement>('[data-slot="property-trailing"]')
    await expect(affordance?.firstElementChild).toBe(link)
  },
}

export const FieldKeepsTheRowWidth: Story = {
  args: {
    ariaLabel: 'Área',
    copyLabel: 'Copiar a área',
    editing: 'inline',
    icon: ShapesIcon,
    onCommit: fn(),
    value: 'Contencioso trabalhista',
  },
  parameters: {
    docs: {
      description: {
        story:
          'O campo editado no lugar não mexe na largura da fileira. Um `input` mede vinte caracteres por conta própria, e sem `propertyFieldClassName` a superfície nasceria maior que o valor, empurrando cópia e link para longe dele.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const surface = canvasElement.querySelector<HTMLElement>('[data-slot="property-surface"]')
    const field = canvasElement.querySelector<HTMLInputElement>('input[data-slot="editable-text"]')
    await expect(surface).not.toBeNull()
    await expect(field).not.toBeNull()
    if (!surface || !field) return

    // The field measures the value, not a fixed box: the row takes the size of
    // what is written, like the read-only one.
    const ruler = document.createElement('span')
    ruler.textContent = field.value
    ruler.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${getComputedStyle(field).font}`
    document.body.append(ruler)
    const inkWidth = ruler.getBoundingClientRect().width
    ruler.remove()

    await expect(field.getBoundingClientRect().width).toBeCloseTo(inkWidth, 0)
  },
}

import { AttachmentProperty, AttachmentsProperty } from '@fifilo/patterns/properties'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LinkIcon, PaperclipIcon } from 'lucide-react'
import { expect } from 'storybook/test'
import { expectAbsenceTone } from '../../../../test-utils/property-surface'

const meta = {
  args: {
    ariaLabel: 'Arquivos do registro',
  },
  component: AttachmentsProperty,
  decorators: [
    (Story) => (
      <div className='flex min-h-72 w-full max-w-xl items-start p-4'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A fileira de anexos com o caminho de adição sempre à vista. Anexar é o que se faz numa fileira vazia, e esconder isso atrás de `…` deixaria o estado inicial sem afordância — por isso a ação é chip próprio, e não entrada de menu como em `Properties/Collection`, onde o `…` guarda visibilidade. O gatilho é **um**, como o `+` de `Properties/Tags`: fileiras que aceitam coisas diferentes são fileiras diferentes, cada uma com seu rótulo. Cada item é um `AttachmentProperty` — ícone tonal pelo `type`, rótulo truncado e o `×` de remover, na mesma anatomia do chip de Tags.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patterns/Properties/Attachments',
} satisfies Meta<typeof AttachmentsProperty>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    action: { icon: PaperclipIcon, label: 'Anexar arquivo', onSelect: () => undefined },
    children: (
      <>
        <AttachmentProperty
          action='download'
          href='#proposta'
          label='Proposta comercial.pdf'
          onRemove={() => undefined}
          removeLabel='Remover Proposta comercial.pdf'
          type='pdf'
        />
        <AttachmentProperty
          action='download'
          href='#contrato'
          label='Contrato assinado.pdf'
          onRemove={() => undefined}
          removeLabel='Remover Contrato assinado.pdf'
          type='doc'
        />
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="attachments-property"]')).not.toBeNull()
    await expect(canvasElement.querySelectorAll('[data-slot="attachment-property"]')).toHaveLength(
      2,
    )
    // A single trigger, collapsed into `+`: two identical `+` would not say which is which.
    await expect(
      canvasElement.querySelectorAll('button[aria-label="Anexar arquivo"]'),
    ).toHaveLength(1)
    await expect(
      canvasElement
        .querySelector('button[aria-label="Anexar arquivo"]')
        ?.getAttribute('data-empty'),
    ).toBeNull()
  },
}

export const Links: Story = {
  args: {
    action: { icon: LinkIcon, label: 'Adicionar link', onSelect: () => undefined },
    ariaLabel: 'Links do registro',
    children: (
      <AttachmentProperty
        href='#playbook'
        label='Playbook do atendimento'
        onRemove={() => undefined}
        removeLabel='Remover Playbook do atendimento'
        type='link'
      />
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Arquivo e link não dividem a mesma fileira: cada uma tem seu rótulo e seu único caminho de adição.',
      },
    },
  },
}

export const ReadOnly: Story = {
  args: {
    children: <AttachmentProperty href='#playbook' label='Playbook do atendimento' type='link' />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sem `action` o gatilho some, e sem `onRemove` o chip perde o `×` — é o estado de quem lista anexos sem poder mexer neles.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('button')).toBeNull()
  },
}

export const Empty: Story = {
  args: {
    action: { icon: PaperclipIcon, label: 'Anexar arquivo', onSelect: () => undefined },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sem anexos ainda, o gatilho aparece por extenso — um `+` sozinho não diria o que adiciona.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('button')?.textContent).toContain('Anexar arquivo')
    await expectAbsenceTone(canvasElement)
  },
}

export const Types: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Um chip por tipo do catálogo. Todos terminam no mesmo `×`: `anchor` e `download` decidem só como o destino abre, não a afordância da direita.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const types = [...canvasElement.querySelectorAll('[data-slot="attachment-type-icon"]')].map(
      (icon) => icon.getAttribute('data-attachment-type'),
    )

    await expect(types).toEqual(['pdf', 'doc', 'audio', 'link'])
    await expect(canvasElement.querySelectorAll('a[download]')).toHaveLength(3)
    await expect(
      canvasElement.querySelectorAll('[data-slot="attachment-property-remove"]'),
    ).toHaveLength(4)
  },
  render: (args) => (
    <AttachmentsProperty {...args}>
      <AttachmentProperty
        action='download'
        href='#proposta'
        label='Proposta comercial.pdf'
        onRemove={() => undefined}
        removeLabel='Remover Proposta comercial.pdf'
        type='pdf'
      />
      <AttachmentProperty
        action='download'
        href='#playbook'
        label='Playbook de onboarding'
        onRemove={() => undefined}
        removeLabel='Remover Playbook de onboarding'
        type='doc'
      />
      <AttachmentProperty
        action='download'
        href='#gravacao'
        label='Gravação da reunião'
        onRemove={() => undefined}
        removeLabel='Remover Gravação da reunião'
        type='audio'
      />
      <AttachmentProperty
        href='#linkedin'
        label='Perfil no LinkedIn'
        onRemove={() => undefined}
        removeLabel='Remover Perfil no LinkedIn'
        type='link'
      />
    </AttachmentsProperty>
  ),
}

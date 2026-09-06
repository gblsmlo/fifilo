import { CategoryFormFields } from '@features/categories/components/forms/category-form'
import type {
  CategoryFormInput,
  CategoryFormValues,
} from '@features/categories/schemas/category-form'
import { categoryFormSchema } from '@features/categories/schemas/category-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FormProvider, useForm } from 'react-hook-form'
import { expect, userEvent, within } from 'storybook/test'

function CategoryFormFrame() {
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: { kind: 'expense', name: '', parentId: null },
    resolver: zodResolver(categoryFormSchema),
  })

  return (
    <FormProvider {...form}>
      <CategoryFormFields
        onSubmit={form.handleSubmit(() => undefined)}
        parentOptions={[{ id: 'cat_home', name: 'Casa' }]}
      />
    </FormProvider>
  )
}

const meta = {
  args: {
    onSubmit: async () => undefined,
    parentOptions: [{ id: 'cat_home', name: 'Casa' }],
  },
  component: CategoryFormFields,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Formulário de criação de categoria, com um nível de subcategoria (Decision 022).',
      },
    },
  },
  tags: ['autodocs', 'storybook-test'],
  title: 'Categories/CategoryForm',
} satisfies Meta<typeof CategoryFormFields>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByLabelText('Nome')).toBeTruthy()
  },
  render: () => <CategoryFormFrame />,
}

export const ValidationErrors: Story = {
  parameters: {
    docs: { description: { story: 'Envio vazio: o nome é obrigatório.' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(await canvas.findByRole('button', { name: 'Criar categoria' }))

    await expect(await canvas.findByText('Informe o nome da categoria.')).toBeTruthy()
  },
  render: () => <CategoryFormFrame />,
}

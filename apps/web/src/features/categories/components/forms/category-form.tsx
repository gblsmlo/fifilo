import { Button } from '@fifilo/ui/components/button'
import { Field, FieldControl, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { FormProvider, useFormContext } from 'react-hook-form'

import { type CategoryFormInput, useCreateCategoryForm } from '../../hooks/use-create-category-form'

const CATEGORY_KIND_LABELS: Record<CategoryFormInput['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
}

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

interface CategoryFormProps {
  onCreated?: () => void
}

export function CategoryForm({ onCreated }: Readonly<CategoryFormProps>) {
  const { form, onSubmit, parentOptions } = useCreateCategoryForm({ onCreated })

  return (
    <FormProvider {...form}>
      <CategoryFormFields
        onSubmit={onSubmit}
        parentOptions={parentOptions.map((category) => ({ id: category.id, name: category.name }))}
      />
    </FormProvider>
  )
}

interface CategoryFormFieldsProps {
  onSubmit: ReturnType<typeof useCreateCategoryForm>['onSubmit']
  parentOptions: ReadonlyArray<{ id: string; name: string }>
}

export function CategoryFormFields({ onSubmit, parentOptions }: Readonly<CategoryFormFieldsProps>) {
  const {
    formState: { errors, isSubmitting },
    register,
  } = useFormContext<CategoryFormInput>()

  return (
    <Form className='flex flex-col gap-5' noValidate onSubmit={onSubmit}>
      <Field invalid={Boolean(errors.name)} name='name'>
        <FieldLabel>Nome</FieldLabel>
        <Input {...register('name')} autoComplete='off' placeholder='Ex.: Mercado' />
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.kind)} name='kind'>
        <FieldLabel>Tipo</FieldLabel>
        <FieldControl
          render={
            <select {...register('kind')} className={selectClassName}>
              {Object.entries(CATEGORY_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          }
        />
        <FieldError>{errors.kind?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.parentId)} name='parentId'>
        <FieldLabel>Categoria pai (opcional)</FieldLabel>
        <FieldControl
          render={
            <select
              {...register('parentId', { setValueAs: (value) => (value === '' ? null : value) })}
              className={selectClassName}
            >
              <option value=''>Nenhuma — categoria de topo</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          }
        />
        <FieldError>{errors.parentId?.message}</FieldError>
      </Field>

      <div className='grid'>
        <Button loading={isSubmitting} type='submit'>
          Criar categoria
        </Button>
      </div>
    </Form>
  )
}

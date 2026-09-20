import { Button } from '@fifilo/ui/components/button'
import { Field, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'

import { type CategoryFormInput, useCreateCategoryForm } from '../../hooks/use-create-category-form'

const CATEGORY_KIND_LABELS: Record<CategoryFormInput['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
}

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
    control,
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
        <Controller
          control={control}
          name='kind'
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-label='Tipo'>
                <SelectValue placeholder='Selecione o tipo'>
                  {(value) => CATEGORY_KIND_LABELS[value as CategoryFormInput['kind']] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {Object.entries(CATEGORY_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
        />
        <FieldError>{errors.kind?.message}</FieldError>
      </Field>

      <Field invalid={Boolean(errors.parentId)} name='parentId'>
        <FieldLabel>Categoria pai (opcional)</FieldLabel>
        <Controller
          control={control}
          name='parentId'
          render={({ field }) => (
            <Select
              onValueChange={(value) => field.onChange(value === 'none' ? null : (value ?? null))}
              value={field.value ?? 'none'}
            >
              <SelectTrigger aria-label='Categoria pai (opcional)'>
                <SelectValue placeholder='Nenhuma — categoria de topo'>
                  {(value) =>
                    value === 'none'
                      ? 'Nenhuma — categoria de topo'
                      : (parentOptions.find((category) => category.id === value)?.name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value='none'>Nenhuma — categoria de topo</SelectItem>
                {parentOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
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

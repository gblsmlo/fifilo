import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { Spinner } from '@fifilo/ui/components/spinner'
import { useQuery } from '@tanstack/react-query'

import { CategoryList } from '../components/category-list'
import { CategoryForm } from '../components/forms/category-form'
import { useReassignCategory } from '../hooks/use-reassign-category'
import { CategoryRequestError } from '../http/errors'
import { categoriesQueryOptions } from '../query-options'

export function CategoriesPage() {
  const categoriesQuery = useQuery(categoriesQueryOptions())
  const reassignCategory = useReassignCategory()

  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-6 p-6'>
      <div className='space-y-2'>
        <h1 className='font-semibold text-3xl tracking-tight'>Categorias</h1>
        <p className='text-muted-foreground'>
          Categorias de receita e despesa do workspace, com um nível de subcategoria.
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1fr_320px]'>
        <div>
          {categoriesQuery.isPending ? (
            <div className='flex justify-center py-12'>
              <Spinner aria-label='Carregando categorias' />
            </div>
          ) : null}

          {!categoriesQuery.isPending ? (
            <CategoryList
              categories={categoriesQuery.data ?? []}
              error={
                categoriesQuery.isError
                  ? {
                      code:
                        categoriesQuery.error instanceof CategoryRequestError
                          ? categoriesQuery.error.code
                          : undefined,
                      message:
                        categoriesQuery.error instanceof CategoryRequestError
                          ? categoriesQuery.error.message
                          : 'Não foi possível carregar as categorias.',
                      onRetry: () => categoriesQuery.refetch(),
                    }
                  : null
              }
              isReassigning={reassignCategory.isPending}
              onReassign={(input, onSuccess) => reassignCategory.mutate(input, { onSuccess })}
              onReassignReset={() => reassignCategory.reset()}
              reassignErrorCode={
                reassignCategory.isError && reassignCategory.error instanceof CategoryRequestError
                  ? reassignCategory.error.code
                  : null
              }
            />
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

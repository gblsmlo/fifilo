import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@web/components/page'

import { CategoryList } from '../components/category-list'
import { CategoryForm } from '../components/forms/category-form'
import { useReassignCategory } from '../hooks/use-reassign-category'
import { CategoryRequestError } from '../http/errors'
import { categoriesQueryOptions } from '../query-options'

export function CategoriesPage() {
  const categoriesQuery = useQuery(categoriesQueryOptions())
  const reassignCategory = useReassignCategory()

  return (
    <Page width='lg'>
      <Page.Header
        align='start'
        description='Categorias de receita e despesa do workspace, com um nível de subcategoria.'
        title='Categorias'
      />

      <div className='grid gap-6 lg:grid-cols-[1fr_320px]'>
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
          isPending={categoriesQuery.isPending}
          isReassigning={reassignCategory.isPending}
          onReassign={(input, onSuccess) => reassignCategory.mutate(input, { onSuccess })}
          onReassignReset={() => reassignCategory.reset()}
          reassignErrorCode={
            reassignCategory.isError && reassignCategory.error instanceof CategoryRequestError
              ? reassignCategory.error.code
              : null
          }
        />

        <Widget className='self-start' title='Nova categoria'>
          <WidgetPanel>
            <CategoryForm />
          </WidgetPanel>
        </Widget>
      </div>
    </Page>
  )
}

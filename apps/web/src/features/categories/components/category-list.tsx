import type { CategoryResponse } from '@fifilo/core/categories'
import { Dialog } from '@fifilo/patterns/dialog'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import { StateSurface } from '@fifilo/patterns/state-surface'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { useState } from 'react'
import { useReassignCategory } from '../hooks/use-reassign-category'
import { CategoryRequestError } from '../http/errors'

const CATEGORY_KIND_LABELS: Record<CategoryResponse['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
}

export interface CategoryListError {
  code?: string
  message: string
  onRetry?: () => void
}

interface CategoryListProps {
  categories: readonly CategoryResponse[]
  error?: CategoryListError | null
}

export function CategoryList({ categories, error = null }: Readonly<CategoryListProps>) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const reassign = useReassignCategory()
  const pending = categories.find((category) => category.id === pendingId) ?? null

  const needsTarget =
    reassign.isError &&
    reassign.error instanceof CategoryRequestError &&
    reassign.error.code === 'target_category_required'

  const closeDialog = () => {
    setPendingId(null)
    setTargetCategoryId('')
    reassign.reset()
  }

  if (error) {
    return (
      <StateSurface
        actions={
          error.onRetry ? [{ label: 'Tentar novamente', onPress: error.onRetry }] : undefined
        }
        description={error.message}
        kind={errorCodeToSurfaceKind(error.code)}
        title='Não foi possível carregar as categorias'
      />
    )
  }

  if (categories.length === 0) {
    return (
      <StateSurface
        description='Crie a primeira categoria para começar a classificar despesas e receitas.'
        kind='empty'
        title='Nenhuma categoria ainda'
      />
    )
  }

  const targetOptions = categories.filter(
    (category) =>
      category.id !== pendingId && category.kind === pending?.kind && !category.archivedAt,
  )

  return (
    <div className='flex flex-col gap-2'>
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className='flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>{category.name}</CardTitle>
              <p className='text-muted-foreground text-sm'>
                {CATEGORY_KIND_LABELS[category.kind]}
                {category.parentId ? ' · subcategoria' : ''}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              {category.archivedAt ? <Badge variant='secondary'>Arquivada</Badge> : null}
              {!category.archivedAt ? (
                <Button onClick={() => setPendingId(category.id)} type='button' variant='ghost'>
                  Arquivar
                </Button>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      ))}

      <Dialog
        errorMessage={
          reassign.isError && !needsTarget ? 'Não foi possível reatribuir a categoria.' : undefined
        }
        footer={
          <Button
            disabled={needsTarget && targetCategoryId === ''}
            loading={reassign.isPending}
            onClick={() =>
              reassign.mutate(
                { id: pending?.id ?? '', targetCategoryId: targetCategoryId || undefined },
                { onSuccess: closeDialog },
              )
            }
            type='button'
          >
            Arquivar
          </Button>
        }
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        open={pending !== null}
        title='Arquivar categoria?'
      >
        {needsTarget ? (
          <div className='flex flex-col gap-2'>
            <p className='text-sm'>
              Esta categoria tem transações. Escolha para onde movê-las antes de arquivar.
            </p>
            <select
              className='h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
              onChange={(event) => setTargetCategoryId(event.target.value)}
              value={targetCategoryId}
            >
              <option value=''>Selecione uma categoria</option>
              {targetOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className='text-sm'>
            "{pending?.name}" para de aceitar novas transações. Se houver transações existentes,
            você escolhe para onde movê-las na próxima etapa.
          </p>
        )}
      </Dialog>
    </div>
  )
}

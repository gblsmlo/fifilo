import type { CategoryResponse } from '@fifilo/core/categories'
import { DataTable, type DataTableColumn } from '@fifilo/patterns/data-table'
import { Dialog } from '@fifilo/patterns/dialog'
import { errorCodeToSurfaceKind } from '@fifilo/patterns/state-kinds'
import type { SurfaceGuardState } from '@fifilo/patterns/state-surface'
import { Widget } from '@fifilo/patterns/widget'
import { Badge } from '@fifilo/ui/components/badge'
import { Button } from '@fifilo/ui/components/button'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Text } from '@fifilo/ui/components/text'
import { useState } from 'react'

const CATEGORY_KIND_LABELS: Record<CategoryResponse['kind'], string> = {
  expense: 'Despesa',
  income: 'Receita',
}

export interface CategoryListError {
  code?: string
  message: string
  onRetry?: () => void
}

export interface ReassignCategoryInput {
  id: string
  targetCategoryId?: string
}

interface CategoryListProps {
  categories: readonly CategoryResponse[]
  error?: CategoryListError | null
  isPending?: boolean
  isReassigning?: boolean
  /** `undefined` clears the error state; set after a failed reassign attempt. */
  reassignErrorCode?: string | null
  onReassign: (input: ReassignCategoryInput, onSuccess: () => void) => void
  onReassignReset: () => void
}

const resolveState = (
  error: CategoryListError | null,
  isPending: boolean,
  isEmpty: boolean,
): SurfaceGuardState => {
  if (error) return errorCodeToSurfaceKind(error.code)
  if (isPending) return 'loading'
  if (isEmpty) return 'empty'
  return 'data'
}

/**
 * Network and mutation state live in the page, this stays presentational
 * (the same split `account-list.tsx` uses): the dialog only reads what it is
 * given and calls back out, so it renders and tests without a QueryClient.
 */
export function CategoryList({
  categories,
  error = null,
  isPending = false,
  isReassigning = false,
  onReassign,
  onReassignReset,
  reassignErrorCode = null,
}: Readonly<CategoryListProps>) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const pending = categories.find((category) => category.id === pendingId) ?? null

  const needsTarget = reassignErrorCode === 'target_category_required'
  const hasOtherError = reassignErrorCode !== null && !needsTarget

  const closeDialog = () => {
    setPendingId(null)
    setTargetCategoryId('')
    onReassignReset()
  }

  const state = resolveState(error, isPending, categories.length === 0)
  const surface = error
    ? {
        actions: error.onRetry
          ? [{ label: 'Tentar novamente', onPress: error.onRetry }]
          : undefined,
        description: error.message,
        title: 'Não foi possível carregar as categorias',
      }
    : isPending
      ? { description: 'Buscando as categorias do workspace.', title: 'Carregando categorias' }
      : {
          description: 'Crie a primeira categoria para começar a classificar despesas e receitas.',
          title: 'Nenhuma categoria ainda',
        }

  const targetOptions = categories.filter(
    (category) =>
      category.id !== pendingId && category.kind === pending?.kind && !category.archivedAt,
  )

  const columns: DataTableColumn<CategoryResponse>[] = [
    {
      cell: (category) => (
        <Text render={<span />} size='sm' weight='medium'>
          {category.name}
        </Text>
      ),
      header: 'Categoria',
      id: 'name',
    },
    {
      cell: (category) => <Badge variant='outline'>{CATEGORY_KIND_LABELS[category.kind]}</Badge>,
      header: 'Tipo',
      id: 'kind',
    },
    {
      cell: (category) => (
        <Text foreground='muted' render={<span />} size='sm'>
          {category.parentId ? 'Subcategoria' : 'Principal'}
        </Text>
      ),
      header: 'Nível',
      id: 'level',
    },
    {
      align: 'end',
      cell: (category) =>
        category.archivedAt ? (
          <Badge variant='secondary'>Arquivada</Badge>
        ) : (
          <Button onClick={() => setPendingId(category.id)} size='sm' type='button' variant='ghost'>
            Arquivar
          </Button>
        ),
      header: <span className='sr-only'>Ações</span>,
      id: 'actions',
    },
  ]

  return (
    <>
      <Widget
        description='Categorias de receita e despesa, com um nível de subcategoria.'
        state={state}
        surface={surface}
        title='Categorias'
      >
        <DataTable
          caption='Categorias do workspace'
          columns={columns}
          rowKey={(category) => category.id}
          rows={categories}
        />
      </Widget>

      <Dialog
        errorMessage={hasOtherError ? 'Não foi possível reatribuir a categoria.' : undefined}
        footer={
          <Button
            disabled={needsTarget && targetCategoryId === ''}
            loading={isReassigning}
            onClick={() =>
              onReassign(
                { id: pending?.id ?? '', targetCategoryId: targetCategoryId || undefined },
                closeDialog,
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
            <Text render={<p />} size='sm'>
              Esta categoria tem transações. Escolha para onde movê-las antes de arquivar.
            </Text>
            <Select
              onValueChange={(value) => setTargetCategoryId(value === 'none' ? '' : (value ?? ''))}
              value={targetCategoryId || 'none'}
            >
              <SelectTrigger aria-label='Categoria de destino'>
                <SelectValue placeholder='Selecione uma categoria'>
                  {(value) =>
                    value === 'none'
                      ? 'Selecione uma categoria'
                      : (targetOptions.find((category) => category.id === value)?.name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value='none'>Selecione uma categoria</SelectItem>
                {targetOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        ) : (
          <Text render={<p />} size='sm'>
            "{pending?.name}" para de aceitar novas transações. Se houver transações existentes,
            você escolhe para onde movê-las na próxima etapa.
          </Text>
        )}
      </Dialog>
    </>
  )
}

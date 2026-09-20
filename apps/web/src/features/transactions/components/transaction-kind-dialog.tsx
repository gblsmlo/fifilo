import type { TransactionResponse } from '@fifilo/core/transactions'
import { Dialog } from '@fifilo/patterns/dialog'
import { Button } from '@fifilo/ui/components/button'
import { Field, FieldLabel } from '@fifilo/ui/components/field'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@fifilo/ui/components/select'
import { Text } from '@fifilo/ui/components/text'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TransactionChange } from '../hooks/use-update-transaction'
import type { TransactionGridAccount, TransactionGridCategory } from './transaction-grid'

export interface PendingKindChange {
  kind: TransactionResponse['kind']
  transaction: TransactionResponse
}

interface TransactionKindDialogProps {
  accounts: readonly TransactionGridAccount[]
  categories: readonly TransactionGridCategory[]
  onConfirm: (transaction: TransactionResponse, change: TransactionChange) => void
  onCreateCategory: () => void
  onOpenChange: (open: boolean) => void
  pending: PendingKindChange | null
}

const KIND_TITLES: Record<TransactionResponse['kind'], string> = {
  expense: 'Mudar para despesa',
  income: 'Mudar para receita',
  transfer: 'Mudar para transferência',
}

/**
 * Each kind carries different fields, so changing it is never one click: a
 * transfer needs the account the money reaches, and an income or an expense
 * needs a category of its own kind — the contract takes neither without them.
 * Everything chosen here travels in the same request as the kind.
 */
export function TransactionKindDialog({
  accounts,
  categories,
  onConfirm,
  onCreateCategory,
  onOpenChange,
  pending,
}: Readonly<TransactionKindDialogProps>) {
  const sourceAccountId = pending?.transaction.legs[0]?.accountId ?? ''
  const [accountId, setAccountId] = useState(sourceAccountId)
  const [targetAccountId, setTargetAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    setAccountId(sourceAccountId)
    setTargetAccountId('')
    setCategoryId('')
  }, [sourceAccountId])

  if (!pending) return null

  const { kind, transaction } = pending
  const options = categories.filter((category) => kind !== 'transfer' && category.kind === kind)
  const destinations = accounts.filter((account) => account.id !== accountId)
  const confirmDisabled =
    kind === 'transfer' ? !accountId || !targetAccountId : !accountId || !categoryId

  const confirm = () => {
    onConfirm(
      transaction,
      kind === 'transfer'
        ? { fromAccountId: accountId, kind, toAccountId: targetAccountId }
        : { accountId, categoryId, kind },
    )
  }

  return (
    <Dialog
      description='Escolha o que o novo tipo exige.'
      footer={
        <Button disabled={confirmDisabled} onClick={confirm} type='button'>
          Salvar
        </Button>
      }
      onOpenChange={onOpenChange}
      open
      title={KIND_TITLES[kind]}
    >
      <div className='flex flex-col gap-5'>
        <Field name='accountId'>
          <FieldLabel>{kind === 'transfer' ? 'Conta de origem' : 'Conta'}</FieldLabel>
          <Select onValueChange={(value) => setAccountId(value ?? '')} value={accountId}>
            <SelectTrigger aria-label={kind === 'transfer' ? 'Conta de origem' : 'Conta'}>
              <SelectValue placeholder='Selecione a conta'>
                {(value) => accounts.find((account) => account.id === value)?.name ?? ''}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        {kind === 'transfer' ? (
          <Field name='toAccountId'>
            <FieldLabel>Conta de destino</FieldLabel>
            <Select
              onValueChange={(value) => setTargetAccountId(value ?? '')}
              value={targetAccountId}
            >
              <SelectTrigger aria-label='Conta de destino'>
                <SelectValue placeholder='Selecione a conta'>
                  {(value) => accounts.find((account) => account.id === value)?.name ?? ''}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {destinations.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        ) : (
          <Field name='categoryId'>
            <FieldLabel>Categoria</FieldLabel>
            {options.length === 0 ? (
              <Text foreground='muted' render={<p />} size='sm'>
                Nenhuma categoria deste tipo ainda.
              </Text>
            ) : (
              <Select onValueChange={(value) => setCategoryId(value ?? '')} value={categoryId}>
                <SelectTrigger aria-label='Categoria'>
                  <SelectValue placeholder='Selecione a categoria'>
                    {(value) => options.find((category) => category.id === value)?.name ?? ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {options.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            )}
            <Button
              className='w-full justify-start'
              onClick={onCreateCategory}
              type='button'
              variant='ghost'
            >
              <PlusIcon aria-hidden='true' />
              Nova categoria
            </Button>
          </Field>
        )}
      </div>
    </Dialog>
  )
}

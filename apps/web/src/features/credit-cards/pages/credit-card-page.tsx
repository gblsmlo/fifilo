import { Stat } from '@fifilo/patterns/stat'
import { Widget, WidgetPanel } from '@fifilo/patterns/widget'
import { formatMoney } from '@libs/format-money'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@web/components/page'
import { useRef, useState } from 'react'

import { accountsQueryOptions } from '../../accounts/query-options'
import { categoriesQueryOptions } from '../../categories/query-options'
import { AttachCreditCardForm } from '../components/forms/attach-credit-card-form'
import { InstallmentPurchaseForm } from '../components/forms/installment-purchase-form'
import { InvoiceDetail } from '../components/invoice-detail'
import { InvoiceList } from '../components/invoice-list'
import { useCloseInvoice } from '../hooks/use-close-invoice'
import { usePayInvoice } from '../hooks/use-pay-invoice'
import { CreditCardRequestError } from '../http/errors'
import {
  availableLimitQueryOptions,
  invoiceQueryOptions,
  invoicesQueryOptions,
} from '../query-options'

interface CreditCardPageProps {
  accountId: string
}

export function CreditCardPage({ accountId }: Readonly<CreditCardPageProps>) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const payIdempotencyKeys = useRef(new Map<string, string>())

  const accountsQuery = useQuery(accountsQueryOptions({ includeArchived: true }))
  const categoriesQuery = useQuery(categoriesQueryOptions())
  const availableLimitQuery = useQuery(availableLimitQueryOptions(accountId))
  const invoicesQuery = useQuery(invoicesQueryOptions(accountId))
  const invoiceQuery = useQuery(invoiceQueryOptions(accountId, selectedInvoiceId ?? ''))

  const closeInvoice = useCloseInvoice(accountId)
  const payInvoice = usePayInvoice(accountId)

  const account = accountsQuery.data?.find((candidate) => candidate.id === accountId)
  const notConfigured =
    availableLimitQuery.isError &&
    availableLimitQuery.error instanceof CreditCardRequestError &&
    availableLimitQuery.error.code === 'credit_card_not_configured'

  if (notConfigured) {
    return (
      <Page width='sm'>
        <Page.Header
          align='start'
          description='Informe o dia de fechamento, o dia de vencimento e o limite para começar a usar o cartão.'
          title={account?.name ?? 'Cartão'}
        />
        <Widget title='Cadastrar cartão'>
          <WidgetPanel>
            <AttachCreditCardForm
              accountId={accountId}
              onAttached={() => availableLimitQuery.refetch()}
            />
          </WidgetPanel>
        </Widget>
      </Page>
    )
  }

  const categoryOptions = (categoriesQuery.data ?? [])
    .filter((category) => category.kind === 'expense' && !category.archivedAt)
    .map((category) => ({ id: category.id, name: category.name }))

  const payFromAccountOptions = (accountsQuery.data ?? [])
    .filter((candidate) => candidate.kind !== 'credit_card' && !candidate.archivedAt)
    .map((candidate) => ({ id: candidate.id, name: candidate.name }))

  const getPayIdempotencyKey = (invoiceId: string): string => {
    const existing = payIdempotencyKeys.current.get(invoiceId)
    if (existing) return existing
    const created = crypto.randomUUID()
    payIdempotencyKeys.current.set(invoiceId, created)
    return created
  }

  return (
    <Page width='xl'>
      <Page.Header
        align='start'
        description='Faturas, itens e compras parceladas do cartão.'
        title={account?.name ?? 'Cartão'}
      />

      <Stat
        className='sm:max-w-xs'
        data-testid='available-limit'
        label='Limite disponível'
        loading={!availableLimitQuery.data}
        value={availableLimitQuery.data ? formatMoney(availableLimitQuery.data) : undefined}
      />

      <div className='grid gap-6 lg:grid-cols-[1fr_1fr_320px]'>
        <InvoiceList
          error={
            invoicesQuery.isError
              ? {
                  code:
                    invoicesQuery.error instanceof CreditCardRequestError
                      ? invoicesQuery.error.code
                      : undefined,
                  message:
                    invoicesQuery.error instanceof CreditCardRequestError
                      ? invoicesQuery.error.message
                      : 'Não foi possível carregar as faturas.',
                  onRetry: () => invoicesQuery.refetch(),
                }
              : null
          }
          invoices={invoicesQuery.data ?? []}
          isPending={invoicesQuery.isPending}
          onSelect={setSelectedInvoiceId}
          selectedInvoiceId={selectedInvoiceId}
        />

        <InvoiceDetail
          error={
            selectedInvoiceId && invoiceQuery.isError
              ? {
                  code:
                    invoiceQuery.error instanceof CreditCardRequestError
                      ? invoiceQuery.error.code
                      : undefined,
                  message:
                    invoiceQuery.error instanceof CreditCardRequestError
                      ? invoiceQuery.error.message
                      : 'Não foi possível carregar a fatura.',
                  onRetry: () => invoiceQuery.refetch(),
                }
              : null
          }
          invoice={invoiceQuery.data?.invoice ?? null}
          isClosing={closeInvoice.isPending}
          isPaying={payInvoice.isPending}
          items={invoiceQuery.data?.items ?? []}
          onClose={() => {
            if (selectedInvoiceId) closeInvoice.mutate(selectedInvoiceId)
          }}
          onPay={(fromAccountId) => {
            if (!selectedInvoiceId) return
            payInvoice.mutate({
              idempotencyKey: getPayIdempotencyKey(selectedInvoiceId),
              invoiceId: selectedInvoiceId,
              payload: { fromAccountId },
            })
          }}
          payFromAccountOptions={payFromAccountOptions}
        />

        <Widget className='self-start' title='Compra parcelada'>
          <WidgetPanel>
            <InstallmentPurchaseForm
              accountId={accountId}
              categoryOptions={categoryOptions}
              currency={account?.currency ?? 'BRL'}
              onCreated={() => invoicesQuery.refetch()}
            />
          </WidgetPanel>
        </Widget>
      </div>
    </Page>
  )
}

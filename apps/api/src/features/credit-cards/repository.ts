import type {
  CardAccountLookup,
  CreditCardRepository,
  InstallmentPlanRepository,
  InvoiceItemReader,
  InvoiceRepository,
} from '@fifilo/core/credit-cards'

import { createCardAccountLookup as createCardAccountLookupPersistence } from './card-account-lookup-persistence'
import { createCreditCardsRepository } from './credit-cards-persistence'
import { createInstallmentPlansRepository } from './installment-plans-persistence'
import { createInvoiceItemReader, createInvoicesRepository } from './invoices-persistence'

/** Composition root only (Decision 003): no SQL or persistence rule lives here. */
export const createCreditCardRepository = (): CreditCardRepository => createCreditCardsRepository()

export const createInvoiceRepository = (): InvoiceRepository => createInvoicesRepository()

export const createInvoiceItemLookup = (): InvoiceItemReader => createInvoiceItemReader()

export const createInstallmentPlanRepository = (): InstallmentPlanRepository =>
  createInstallmentPlansRepository()

export const createCardAccountLookup = (): CardAccountLookup => createCardAccountLookupPersistence()

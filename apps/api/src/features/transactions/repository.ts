import type {
  AccountLookup,
  CategoryLookup,
  TransactionRepository,
} from '@fifilo/core/transactions'

import { createFinancialAccountLookup } from './account-lookup-persistence'
import { createCategoriesLookup } from './category-lookup-persistence'
import { createTransactionsRepository } from './transactions-persistence'

/** Composition root only (Decision 003): no SQL or persistence rule lives here. */
export const createTransactionRepository = (): TransactionRepository =>
  createTransactionsRepository()

export const createAccountLookup = (): AccountLookup => createFinancialAccountLookup()

export const createCategoryLookup = (): CategoryLookup => createCategoriesLookup()

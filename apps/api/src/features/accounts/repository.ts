import type { AccountRepository, EntryReader } from '@fifilo/core/accounts'
import { createFinancialEntryReader } from './entry-reader-persistence'
import { createFinancialAccountRepository } from './financial-accounts-persistence'

/**
 * Composition root only (Decision 003): no SQL, `*Row` type or persistence
 * rule lives here, just the wiring a route needs.
 */
export const createAccountRepository = (): AccountRepository => createFinancialAccountRepository()

export const createEntryReader = (): EntryReader => createFinancialEntryReader()

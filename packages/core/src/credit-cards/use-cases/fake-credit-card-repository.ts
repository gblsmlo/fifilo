import type { CreditCardDetails } from '../credit-card'
import type { CardAccount, CardAccountLookup, CreditCardRepository } from '../ports'

/** An in-memory stand-in for the Drizzle adapter, shared by this folder's tests. */
export const createFakeCreditCardRepository = (
  seed: CreditCardDetails[] = [],
): CreditCardRepository => {
  const cards = new Map(seed.map((card) => [card.accountId, card]))

  return {
    async create(record) {
      if (cards.has(record.accountId)) return null
      const card: CreditCardDetails = {
        accountId: record.accountId,
        closingDay: record.closingDay,
        createdAt: record.createdAt,
        dueDay: record.dueDay,
        limitMinor: record.limitMinor,
        organizationId: record.organizationId,
        updatedAt: record.createdAt,
        version: 1,
      }
      cards.set(card.accountId, card)
      return card
    },

    async findByAccountId(organizationId, accountId) {
      const card = cards.get(accountId)
      return card && card.organizationId === organizationId ? card : null
    },
  }
}

export const createFakeCardAccountLookup = (accounts: CardAccount[]): CardAccountLookup => ({
  async findById(_organizationId, id) {
    return accounts.find((account) => account.id === id) ?? null
  },
})

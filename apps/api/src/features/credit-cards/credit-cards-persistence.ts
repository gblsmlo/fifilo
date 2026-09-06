import type {
  CreditCardDetails,
  CreditCardRepository,
  NewCreditCardRecord,
} from '@fifilo/core/credit-cards'
import type { EntityId } from '@fifilo/core/primitives'
import { isUniqueViolation } from '@fifilo/infra-database/postgres-errors'
import { creditCardDetails } from '@fifilo/infra-database/schema'
import { withWorkspaceTransaction } from '@fifilo/infra-database/workspace'
import { and, eq } from 'drizzle-orm'

type CreditCardRow = typeof creditCardDetails.$inferSelect

const mapRow = (row: CreditCardRow): CreditCardDetails => ({
  accountId: row.accountId as EntityId,
  closingDay: row.closingDay,
  createdAt: row.createdAt,
  dueDay: row.dueDay,
  limitMinor: row.limitMinor,
  organizationId: row.organizationId,
  updatedAt: row.updatedAt,
  version: row.version,
})

const createCreditCardRow = async (
  record: NewCreditCardRecord,
): Promise<CreditCardDetails | null> => {
  try {
    return await withWorkspaceTransaction(record.organizationId, async (tx) => {
      const [inserted] = await tx
        .insert(creditCardDetails)
        .values({
          accountId: record.accountId,
          closingDay: record.closingDay,
          createdAt: record.createdAt,
          dueDay: record.dueDay,
          limitMinor: record.limitMinor,
          organizationId: record.organizationId,
          updatedAt: record.createdAt,
        })
        .returning()

      if (!inserted) throw new Error('credit_card_details insert returned no row.')
      return mapRow(inserted)
    })
  } catch (error) {
    if (isUniqueViolation(error)) return null
    throw error
  }
}

const findCreditCardByAccountId = async (
  organizationId: string,
  accountId: EntityId,
): Promise<CreditCardDetails | null> =>
  withWorkspaceTransaction(organizationId, async (tx) => {
    const [row] = await tx
      .select()
      .from(creditCardDetails)
      .where(
        and(
          eq(creditCardDetails.organizationId, organizationId),
          eq(creditCardDetails.accountId, accountId),
        ),
      )
      .limit(1)

    return row ? mapRow(row) : null
  })

export const createCreditCardsRepository = (): CreditCardRepository => ({
  create: createCreditCardRow,
  findByAccountId: findCreditCardByAccountId,
})

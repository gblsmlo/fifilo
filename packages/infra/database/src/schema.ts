import { desc, relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  char,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
})

export const organizations = pgTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: text('metadata'),
  },
  (table) => [index('organizations_slug_idx').on(table.slug)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeOrganizationId: text('active_organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_active_organization_id_idx').on(table.activeOrganizationId),
  ],
)

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('members_organization_id_idx').on(table.organizationId),
    index('members_user_id_idx').on(table.userId),
    uniqueIndex('members_organization_user_unique').on(table.organizationId, table.userId),
  ],
)

export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('invitations_organization_id_idx').on(table.organizationId),
    index('invitations_email_idx').on(table.email),
  ],
)

export const twoFactors = pgTable(
  'two_factors',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    verified: boolean('verified').notNull().default(false),
  },
  (table) => [
    index('two_factors_secret_idx').on(table.secret),
    index('two_factors_user_id_idx').on(table.userId),
  ],
)

export const notificationOutbox = pgTable(
  'notification_outbox',
  {
    id: text('id').primaryKey(),
    eventType: text('event_type').notNull(),
    status: text('status').notNull().default('pending'),
    recipientEmail: text('recipient_email').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notification_outbox_status_available_at_idx').on(table.status, table.availableAt),
    index('notification_outbox_event_type_idx').on(table.eventType),
  ],
)

/**
 * Backs `apps/api/src/libs/idempotency.ts` (operation.md § `idempotency_key`
 * on commands). `(organization_id, key)` is the primary key itself, not a
 * separate unique index on a surrogate id: it is the only way this table is
 * ever looked up. Retention is 90 days (security.md); nothing prunes it yet.
 */
export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseBody: jsonb('response_body').$type<unknown>(),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.key] })],
)

/**
 * The first tenant-owned table (Fase 01). Composite primary key and every
 * foreign key between tenant tables carry `organization_id` (Decision 019):
 * referential-integrity checks bypass row security, so a simple key would
 * only prove a row exists, not that it belongs to this workspace. RLS itself
 * (Decision 020) is applied by hand in the migration this table ships in —
 * `enable`, `force` and the policy have no Drizzle Kit builder.
 */
export const financialAccounts = pgTable(
  'financial_accounts',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    institution: text('institution'),
    currency: char('currency', { length: 3 }).notNull(),
    color: text('color'),
    icon: text('icon'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.id] }),
    // Archiving and recreating an account under the same name must work
    // (Fase 01 § Riscos): a total unique index would forbid it, so only an
    // active row competes for the name.
    uniqueIndex('financial_accounts_org_name_unique')
      .on(table.organizationId, sql`lower(${table.name})`)
      .where(sql`${table.archivedAt} is null`),
  ],
)

/**
 * One level of subcategory, kind fixed and inherited by any child (Decision
 * 022). `parent_id` self-references composite; MATCH SIMPLE (Postgres'
 * default) skips the check when `parent_id` is null, which is every
 * top-level category.
 */
export const categories = pgTable(
  'categories',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    parentId: text('parent_id'),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    color: text('color'),
    icon: text('icon'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.id] }),
    foreignKey({
      columns: [table.organizationId, table.parentId],
      foreignColumns: [table.organizationId, table.id],
    }),
    // Name collides only within the same parent and kind (Decision 022):
    // `coalesce` folds the top level to '' so there is no null to special-case.
    uniqueIndex('categories_org_parent_kind_name_unique')
      .on(
        table.organizationId,
        sql`coalesce(${table.parentId}, '')`,
        table.kind,
        sql`lower(${table.name})`,
      )
      .where(sql`${table.archivedAt} is null`),
  ],
)

/**
 * Groups the entries of one money movement (Decision 021); it never holds
 * the amount itself. `category_id` is null for a transfer (Decision 023).
 */
export const transactions = pgTable(
  'transactions',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    kind: text('kind').notNull(),
    description: text('description').notNull(),
    notes: text('notes'),
    occurredOn: date('occurred_on').notNull(),
    categoryId: text('category_id'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.id] }),
    foreignKey({
      columns: [table.organizationId, table.categoryId],
      foreignColumns: [categories.organizationId, categories.id],
    }),
    index('transactions_org_occurred_idx').on(table.organizationId, desc(table.occurredOn)),
    index('transactions_org_category_occurred_idx').on(
      table.organizationId,
      table.categoryId,
      table.occurredOn,
    ),
  ],
)

/**
 * The perna (leg) of any money movement (Decision 021). No `to_account_id`
 * on a `transactions` row: a transfer is a pair of entries summing to zero, a
 * balance is `sum(amount_minor)` with no special case, and a card statement
 * is a query over entries, not a second model. `transaction_id` had no
 * foreign key in Fase 01, since `transactions` did not exist yet; Fase 02
 * adds it as an expand step (operation.md).
 */
export const entries = pgTable(
  'entries',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    transactionId: text('transaction_id'),
    accountId: text('account_id').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    occurredOn: date('occurred_on').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.id] }),
    foreignKey({
      columns: [table.organizationId, table.accountId],
      foreignColumns: [financialAccounts.organizationId, financialAccounts.id],
    }),
    // Added in Fase 02: entries.transaction_id had no FK yet in Fase 01,
    // because `transactions` did not exist (an expand step, operation.md).
    foreignKey({
      columns: [table.organizationId, table.transactionId],
      foreignColumns: [transactions.organizationId, transactions.id],
    }),
    index('entries_org_account_occurred_idx').on(
      table.organizationId,
      table.accountId,
      table.occurredOn,
    ),
  ],
)

export const financialAccountsRelations = relations(financialAccounts, ({ many }) => ({
  entries: many(entries),
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  account: one(financialAccounts, {
    fields: [entries.organizationId, entries.accountId],
    references: [financialAccounts.organizationId, financialAccounts.id],
  }),
  transaction: one(transactions, {
    fields: [entries.organizationId, entries.transactionId],
    references: [transactions.organizationId, transactions.id],
  }),
}))

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  children: many(categories, { relationName: 'category_parent' }),
  parent: one(categories, {
    fields: [categories.organizationId, categories.parentId],
    references: [categories.organizationId, categories.id],
    relationName: 'category_parent',
  }),
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ many, one }) => ({
  category: one(categories, {
    fields: [transactions.organizationId, transactions.categoryId],
    references: [categories.organizationId, categories.id],
  }),
  entries: many(entries),
}))

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  invitations: many(invitations),
  memberships: many(members),
  sessions: many(sessions),
  twoFactors: many(twoFactors),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  invitations: many(invitations),
  members: many(members),
  sessions: many(sessions),
}))

export const authSchema = {
  accounts,
  invitations,
  members,
  organizations,
  sessions,
  twoFactors,
  users,
  verifications,
}

export const databaseSchema = {
  ...authSchema,
  categories,
  entries,
  financialAccounts,
  idempotencyRecords,
  notificationOutbox,
  transactions,
}

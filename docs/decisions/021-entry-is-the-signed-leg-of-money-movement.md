# Decision 021: the entry is the signed leg of a money movement; the transaction groups entries

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 01](../plans/fifilo/fase-01-contas-carteiras-e-saldo.md), consumed by
[Fase 02](../plans/fifilo/fase-02-categorias-e-transacoes.md) onward.

## Context

Fase 01 needed to decide the shape of the first real movement of money: an
account's balance, and what "the opening balance" is. The obvious modeling —
`transactions` carrying `account_id` and, for a transfer, a second
`to_account_id` — was considered and rejected before it was written, because
its cost shows up immediately in the very next phase, not eventually.

A transfer with a special second column forces every consumer to know about
it: a balance query needs a `UNION` or a `CASE` to account for the reverse
leg, a category report needs to explicitly skip transfers unless it also
special-cases the second column, and a card statement — a set of entries
against one account, chronologically — needs its own query shape instead of
reusing the one every other view already has.

## Options considered

1. **`transactions` with `account_id` and an optional `to_account_id`.**
   Reads naturally for income and expense. A transfer is a second kind of
   row, and every aggregate gains a branch to treat it correctly.
2. **A ledger of signed entries, with `transactions` as a grouping label.**
   An entry is one row: an account, a signed amount, a date. A transaction
   groups the entries that happened together and carries the shared
   description, category and metadata. Balance, statement and aggregation are
   the same query for every kind of movement.

## Decision

Adopt option 2.

### The entry is the unit of balance

```ts
export type TransactionLeg = { accountId: EntityId; amountMinor: number }
```

`entries` (Fase 01's table) is one row per leg: `account_id`, a signed
`amount_minor`, `occurred_on` (Decision 018), and a nullable `transaction_id`
— nullable because Fase 01 ships before `transactions` exists, and an opening
balance is an entry with no transaction to group under.

A balance is `sum(amount_minor)` filtered by account. One formula, no branch
for a transfer, no branch for an opening balance.

### The transaction groups entries; it does not hold the amount

`transactions` (Fase 02) carries what is shared across the legs of one
movement — description, category, date, notes — never the signed amount
itself. Income and expense produce one entry; a transfer produces two,
summing to zero by construction (`deriveLegs` in
`packages/core/src/transactions/transaction.ts`).

### The sign is never client input

The client sends a positive amount; `deriveLegs` derives the sign from the
transaction's kind. A signed amount from the client is a path to a positive
expense reaching the database — the exact shape of a bug that is expensive to
notice and cheap to make unrepresentable.

## Consequences

- Balance, account statement, category aggregation and the future credit-card
  statement are the same query shape: entries filtered and grouped, never a
  transaction-specific special case.
- A transfer is exactly two entries with opposite signs. Paying a credit-card
  bill ([Fase 03](../plans/fifilo/fase-03-cartao-de-credito.md)) is a transfer,
  with no new code.
- This is not full double-entry bookkeeping: income and expense have one leg,
  because the counterparty (an employer, a merchant) is outside the system.
  The invariant the domain enforces is narrower and stated once: a transfer's
  legs sum to zero, every other kind's leg carries the sign its kind implies.
- Editing a transaction rewrites its entries inside the same database
  transaction, never a partial update of one leg — Fase 02's own adapter
  deletes and reinserts rather than diffing.

## Revisit when

- A capability needs true double-entry accounting with an internal
  counterparty account. That is a different invariant, not an extension of
  this one.
- A movement legitimately needs more than two legs (a split transaction across
  more than one category or account in a single entry). Fase 02's own
  transaction/category split covers "one payment, one category" today.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 017: the signed integer the entry's `amount_minor` carries.
- Decision 018: `occurred_on` is the civil date the entry and the transaction
  both carry.
- Decision 019: the composite key that makes `entries.account_id` provably
  this workspace's account.
- `packages/core/src/accounts/ports.ts`, `packages/core/src/transactions/transaction.ts`.

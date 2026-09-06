# Decision 025: paying an invoice is a transfer, not a new movement type

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 03](../plans/fifilo/fase-03-cartao-de-credito.md).

## Context

Decision 021 modeled every money movement as a transaction grouping signed
entries; Decision 023 showed a transfer between two of the workspace's own
accounts costs nothing new on top of that. Paying a credit card bill is,
mechanically, exactly that: money leaves a checking account and lands on the
card account, reducing what is owed. The naive path is to invent a `payment`
transaction kind with its own rules, its own legs and its own reporting
exclusion — a second way to represent a movement `transfer` already
represents correctly.

## Options considered

1. **A new `payment` transaction kind**, mirroring `transfer` but tagged
   differently. Doubles the invariant surface (Decision 023's "sum of legs by
   kind" table gains a row that behaves identically to an existing one) for a
   distinction no consumer of `transactions` actually needs — a payment and a
   transfer both move money between two workspace accounts with zero net
   effect on the workspace's total.
2. **Reuse `transfer` as-is.** `payInvoice` calls `createTransaction` from
   the transactions module directly, with `fromAccountId` the account the
   user chose and `toAccountId` the card account the invoice belongs to. The
   invoice is marked paid alongside it, in the same use case.

## Decision

Adopt option 2.

### `payInvoice` composes two existing capabilities, not a new one

`packages/core/src/credit-cards/use-cases/pay-invoice.ts` validates the
invoice is closed (or overdue) and not already paid, then calls
`createTransaction` with `kind: 'transfer'` for the invoice's full total.
`packages/core/src/transactions` owns the legs, the currency check and the
zero-sum invariant; this use case owns nothing about money movement it did
not already own for a plain transfer.

### Paying is the first command that cannot duplicate

`POST /api/invoices/:id/pay` requires `Idempotency-Key` (Fase 00's envelope,
`apps/api/src/libs/idempotency.ts`) — the first command in the product with
a real cost to a duplicate: a second, accidental transfer would move real
money twice. `POST /api/invoices/:id/close` needs no such envelope: the use
case's own no-op on an already-closed invoice makes closing naturally
idempotent without one.

### Fase 03 pays in full; a partial payment is deferred

The command accepts no amount — it always pays `invoice.totalMinor`.
Fase 03 § Modelagem describes a partial payment carrying its remainder into
the next invoice as its own line item; building that untested, ahead of any
consumer asking for it, would be worse than naming the cut. The closing
criteria this phase must prove (double-pay produces one payment, a card
purchase never touches cash) do not need it.

## Consequences

- No new transaction kind, no new leg-sum invariant, no new category
  exclusion for reports: `transfer`'s existing rules apply unchanged.
- The idempotency key is the only new transport-level requirement this phase
  introduces; every other route continues without one because nothing else
  yet has an effect a duplicate call would corrupt.
- A partial payment is a known gap, not a silent one: the code has nowhere
  to accept a partial amount today, and the plan and this decision both say
  why.

## Revisit when

- Partial payment ships. `payInvoice`'s signature grows an amount, the
  remainder needs its own line item in the next invoice, and this decision's
  "pays in full" clause needs a successor note.
- A payment provider outside the workspace's own accounts enters the product
  (an external bank transfer, a card network settlement) — today every
  payment is between two accounts this workspace already owns.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 021: the entry is the signed leg; Decision 023: a transfer is the
  shape this decision reuses without change.
- Decision 024: the invoice is a row with state; paying is one of the writes
  that changes it.
- `packages/core/src/credit-cards/use-cases/pay-invoice.ts`,
  `packages/core/src/transactions/use-cases/create-transaction.ts`,
  `apps/api/src/libs/idempotency.ts`.

# Decision 023: a transfer is a two-leg transaction with zero sum and no category

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 02](../plans/fifilo/fase-02-categorias-e-transacoes.md).

## Context

Decision 021 already settled that a transaction groups signed entries instead
of holding an amount itself, precisely so a transfer costs nothing new at the
storage layer. What Decision 021 did not settle is the rule a transfer must
satisfy, and whether it carries a category the way income and expense do.

A transfer moving money between two of the workspace's own accounts is not
income and it is not an expense — nothing left the workspace and nothing
entered it. Filing it under a category answers a question ("where did this
money go") that has no honest answer for a transfer, and a "Transfers"
category invented to hold it would need permanent, silent exclusion from
every income/expense report or it double-counts money that never actually
changed the workspace's total.

## Options considered

1. **Require a category on every transaction, including transfers.** Forces
   an artificial category that every aggregation must then know to exclude,
   or the report double-counts.
2. **Transfer forbids a category; its invariant is a two-leg, zero-sum
   transaction validated the same way for every transfer, with no per-route
   exception.**

## Decision

Adopt option 2.

### The invariant, by kind

| Kind | Legs | Category | Sum of legs |
| --- | --- | --- | --- |
| `income` | 1, positive | required, `kind = income` | `+amount` |
| `expense` | 1, negative | required, `kind = expense` | `-amount` |
| `transfer` | 2, opposite | forbidden | `0` |

`deriveLegs` in `packages/core/src/transactions/transaction.ts` is the single
function that produces legs for all three kinds; a transfer's two legs are
constructed to sum to zero, not validated after the fact.

### A transfer's two accounts must differ and share a currency

Transferring an account to itself is a `validation` failure at the contract
boundary (`z.discriminatedUnion` refinement in
`packages/core/src/transactions/schemas.ts`), not a domain check reachable
only after a round trip. Two accounts in different currencies are rejected in
this phase (`currency_mismatch`): a cross-currency transfer needs an exchange
rate and a rate date, which is a decision of its own, not an extension of this
one — the same reasoning Decision 017 already applied to money conversion in
general.

### The amount is always positive at the boundary; the sign is derived

Same rule as income and expense (Decision 021): the client never sends a
signed amount for a transfer. `amountMinor` is the magnitude; `deriveLegs`
assigns the negative sign to the source leg and the positive sign to the
destination leg.

### A category-based report excludes transfers by construction

Because a transfer's `category_id` is `null`, every category aggregation
already excludes it by filtering on a non-null category — no special case, no
maintained exclusion list.

## Consequences

- A transfer is representable in exactly one way: two legs, opposite sign,
  same magnitude, no category. There is no second shape to reconcile against.
- Paying a credit card bill ([Fase 03](../plans/fifilo/fase-03-cartao-de-credito.md))
  is a transfer with no new modeling: the credit card is an account, and
  settling its balance moves money from a checking account to it.
- Category reports need no transfer-awareness at all; the `null` category
  already does the filtering.
- Multi-currency transfers stay explicitly out of scope until a rate and a
  rate date are decided, rather than silently allowed with a wrong number.

## Revisit when

- Multi-currency accounts and conversion enter the product (Decision 017's own
  revisit condition). A transfer between different currencies needs a rate,
  a rate date and a decision of its own.
- A transaction legitimately needs more than two legs, or a split across more
  than one category — Fase 02's category/transaction split already covers
  "one payment, one category," and this decision does not extend past it.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 021: the entry is the signed leg; this decision states the
  invariant a transfer's legs satisfy.
- Decision 017: money has no floating point, and multi-currency conversion is
  explicitly deferred, for the same reason it is deferred here.
- Decision 002: the sign is derived server-side; the client sends only a
  positive magnitude.
- `packages/core/src/transactions/transaction.ts`,
  `packages/core/src/transactions/schemas.ts`.

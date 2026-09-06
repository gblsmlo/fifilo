# Decision 024: the invoice is a row with state; the billing cycle is derived from the closing day

## Status

Active. Recorded on 2026-09-06 for the Fifilo product domain. Executed in
[Fase 03](../plans/fifilo/fase-03-cartao-de-credito.md).

## Context

A credit card bill has two different kinds of fact. The period a purchase
falls into — which cycle, which due date — is arithmetic: given `closingDay`
and a date, the answer is the same every time. Whether that cycle's bill has
been closed, paid or is overdue is not arithmetic: it is state that a user or
a scheduled process changes, and once changed must not silently revert
because the closing day changed later or a purchase landed retroactively.

Storing the cycle boundaries as an editable fact invites the two failures
Fase 03 § Riscos names: a changed closing day rewriting past invoices, and a
late-arriving purchase reopening one already closed and paid.

## Options considered

1. **Store the cycle boundaries and recompute status from them on every
   read.** Cheapest to write, but a changed `closingDay` changes every past
   invoice's dates retroactively — the exact defect this decision exists to
   avoid.
2. **Derive the cycle from `closingDay` at the moment an entry needs one,
   persist only the resulting invoice row (period, due date, status,
   total).** The row exists because it has state a pure function cannot
   carry; the period on it is a frozen snapshot of what the formula produced
   at creation, not a live recomputation.

## Decision

Adopt option 2.

### The cycle is a pure function of `closingDay`, `dueDay` and a date

`deriveBillingCycle` in `packages/core/src/credit-cards/cycle.ts` takes no
persisted state. Two rules the calendar does not give for free, each proven
by its own test case (Fase 03 § Critério de conclusão):

- a purchase **on** the closing date belongs to the next cycle, not the one
  closing that day;
- a due day earlier than the closing day falls in the month after closing,
  never the same month.

Day 31 against a shorter month clamps to that month's last day
(`dateInMonth`), covering February and every 30-day month with one function,
not a per-month special case.

### The invoice row exists only because the cycle has state

`card_invoices` carries `period_start`, `period_end`, `due_on` — a frozen
snapshot from the moment `resolveInvoiceForOccurrence` created it, never
recomputed — plus `status`, `total_minor`, `closed_at`, `paid_at`. Closing
freezes the entry set and computes the total; nothing changes those period
columns again.

### A retroactive entry never reopens a closed invoice

An entry whose naturally-derived cycle already closed is redirected to the
account's current open invoice instead (the earliest open one, protecting
against a future pre-created installment placeholder being mistaken for
"current"). The closed invoice's frozen total stands.

### `overdue` is read-time, never written

`effectiveStatus` in `packages/core/src/credit-cards/invoice.ts` computes
`overdue` from `status = closed` and `today > due_on` at the moment of a
read. Nothing schedules the transition and the stored `status` column only
ever holds `open`, `closed` or `paid`.

## Consequences

- Changing a card's `closingDay` changes only future cycles; every already-created
  invoice keeps the period it was created with.
- A late purchase never reopens a paid or closed invoice; it lands on the
  current one, flagged as retroactive at the domain layer even though the
  wire contract does not yet expose that flag (Fase 03's own scope).
- `overdue` needs no cron, no scheduled job and no write path of its own —
  it is one comparison at read time.
- Installments can pre-create future invoices (one per consecutive cycle)
  without any of them being mistaken for the account's actual current one:
  `findCurrentOpenByAccount` orders by `period_start` ascending.

## Revisit when

- A workspace needs to see its own past cycle boundaries recomputed under a
  hypothetically different closing day (a "what if" projection) — today the
  frozen row is the only source of truth, deliberately.
- Partial payment lands (Fase 03 § Riscos names it, deferred this phase): the
  remainder-as-a-new-line-item rule will need its own note on how it
  interacts with a frozen invoice total.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 018: the financial fact is a civil date; the cycle's period and
  due dates are civil dates for the same reason `occurredOn` is.
- Decision 025: paying an invoice is a transfer, not a new movement type.
- `packages/core/src/credit-cards/cycle.ts`,
  `packages/core/src/credit-cards/invoice.ts`,
  `packages/core/src/credit-cards/use-cases/resolve-invoice-for-occurrence.ts`.

# BUG-002: creating a transaction or an installment purchase carried no idempotency guarantee

## State

Resolved in the commit that carries this record.

## Severity

Defeito (Fase 06 acceptance audit classification). Not a bloqueador: no data
was ever actually corrupted by this in normal use, and every other financial
write route in the codebase already required the header - only these two
missed it. Held against the Marco 2 gate anyway, since NFR-05 is one of the
ten NFRs the gate names by number.

## Environment

- Revision reproduced: `af20772` (Fase 06, before this record's fix).
- Found during the Fase 06 § "Auditoria de aceitação" exercise, checking
  NFR-05 ("`idempotency_key` em todo comando com efeito externo") against the
  real route table rather than against the tests already written for it.

## Summary

`POST /api/invoices/:id/pay` requires an `Idempotency-Key` header and refuses
the request with 400 without one - the one financial write route this
starter got right from the start. `POST /api/transactions` (creates an
expense, income or transfer) and `POST /api/transactions/installments`
(creates every transaction in an installment plan at once) did not: the
first treated the header as optional and silently skipped idempotency when
absent, the second never read it at all. Web's own `createTransaction`
never sent one either - a real double-click or a retried request after a
slow network response could register the same expense, income, transfer or
entire installment plan twice, with nothing in the request path to catch it.

## Reproduction

```
POST /api/transactions
Content-Type: application/json
(no Idempotency-Key header)

{"accountId":"...","amountMinor":5000,"categoryId":"...","description":"Mercado","kind":"expense","occurredOn":"2026-01-15"}
```

Before the fix: `201 Created`, a new transaction and entry every time,
regardless of how many times the exact same request repeats. After the fix:
`400 Bad Request`, `{"error":{"code":"idempotency_key_required", ...}}` -
the same shape `pay` already answered.

## Hypothesis

`pay`'s idempotency requirement was added deliberately (Fase 04's own
session work names it), but the pattern was never generalized to the two
other routes that create a financial movement from a single user action -
`createTransaction` (Fase 02) and `createInstallmentPurchase` (Fase 03) each
shipped before `pay`'s precedent existed, and neither fase's own closing
audit re-checked the two earlier routes against the requirement Fase 04
established.

## Closing condition

- `POST /api/transactions` and `POST /api/transactions/installments` both
  answer `400 idempotency_key_required` without the header, and successfully
  process a request that includes one - both wrapped in the same
  `withIdempotency` envelope `pay` already uses, so a replayed request
  answers the same stored response instead of writing twice.
- `apps/web/src/features/transactions/hooks/use-create-transaction-form.ts`
  and `apps/web/src/features/credit-cards/hooks/use-create-installment-purchase-form.ts`
  each generate a key once per submit attempt (a `useRef`, not regenerated on
  a retry of the same attempt) and clear it after a success, so the next
  distinct transaction gets a fresh one.
- `e2e/transactions/transactions.spec.ts`, `e2e/credit-cards/credit-cards.spec.ts`
  and the route/sweep unit tests all still pass with the requirement in place.

## Related

- [`docs/bugs/README.md`](README.md) resolves `BUG-NNN` → file → state.
- [Fase 06](../plans/fifilo/fase-06-settings-e-aceitacao.md)'s own acceptance
  audit found this checking NFR-05 from
  [`docs/plans/fifilo/README.md`](../plans/fifilo/README.md).

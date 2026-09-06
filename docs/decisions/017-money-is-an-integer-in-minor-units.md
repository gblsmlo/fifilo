# Decision 017: money is an integer in minor units

## Status

Active. Recorded on 2026-09-06 as the first decision of the Fifilo product
domain; it has no counterpart in the neutral starter. Executed in
[Fase 00](../plans/fifilo/fase-00-fundacao-do-produto.md).

## Context

Every capability from accounts onward stores, sums, splits and displays money.
The repository has no monetary primitive: `packages/core/src/primitives.ts`
carries `EntityId`, `NonEmptyString` and `WorkspaceSlug`, and nothing else.

The default path in TypeScript is the wrong one. A JavaScript `number` is an
IEEE-754 double, so `0.1 + 0.2` is not `0.3`, and a balance built by summing
thousands of such values drifts. The drift is small enough to survive review
and large enough to make a user distrust the product, which in a financial
application is the whole product.

Drizzle offers three plausible column types and each one decides a different
application-side representation. The choice has to be made once, before the
first table, because changing it later means rewriting every row, every
contract and every arithmetic call site at the same time.

## Options considered

1. **`double precision` and a JavaScript `number` in decimal units.** The
   ordinary path. Rejected without further analysis: it is inexact by
   construction for the one thing this product exists to get right.
2. **`numeric(20, 4)` and a decimal library** (`decimal.js`, `big.js`) in
   the application. Exact and arbitrary precision. The cost is that the
   application type is a library object: it does not survive `JSON.stringify`
   unchanged, so every contract needs a mapper; Drizzle returns `numeric` as a
   string by default, so every read crosses a point where a plain `Number(...)`
   silently reintroduces the double; and the dependency reaches `packages/core`,
   which today depends only on Zod.
3. **Signed integer in minor units** in a `bigint` column, with a `Money`
   value and pure operations in Core.

## Decision

Adopt option 3.

### Representation

```ts
export type Money = { amountMinor: number; currency: CurrencyCode }
```

`amountMinor` is a signed integer in the currency's minor unit. Negative means
money leaving. `currency` is an ISO 4217 three-letter code.

The exponent is read from a table in `packages/core`, never assumed to be 2.
BRL and USD are 2, JPY is 0, BHD is 3. Code that divides by 100 anywhere
outside that table is a review finding.

### Column type and mode

`bigint('amount_minor', { mode: 'number' })`.

`mode: 'bigint'` is rejected for a specific reason: `JSON.stringify` throws on
a `BigInt`, so every response carrying money would need a serializer, and the
failure appears only when a value actually crosses the wire — in a route that
looked correct in every unit test. `mode: 'number'` is exact up to
`Number.MAX_SAFE_INTEGER`, which is about 90 trillion in BRL.

That ceiling is real, so the contract declares it instead of leaving it
implicit. Money fields are `z.int()` with an explicit `min` and `max` inside
the safe range, which turns an overflow into a `422` at the boundary rather
than a wrong number in the database.

### No floating point in any layer

Core, adapters, routes, contracts and Web all carry the integer. Display
formatting is `Intl.NumberFormat` applied to the integer, in the Web only, and
is never fed back into a calculation. A form field edits the integer through a
mask; it never parses the displayed text.

### Arithmetic lives in Core

`add`, `subtract`, `negate`, `compare` and `allocate` are pure functions with
tests. Two operands of different currencies are a validation failure, never an
implicit conversion.

`allocate` is the one that matters and the one that is usually written wrong:
splitting 100 into three parts yields 34, 33, 33 — the remainder is
distributed one minor unit at a time — so the parts always sum back to the
total. `total / n` rounded n times does not, and the missing cent surfaces in
a credit card installment plan, in front of the user.

## Consequences

- A balance is `sum(amount_minor)` in PostgreSQL and an exact integer in
  JavaScript. There is no rounding step between the database and the screen.
- The safe-integer ceiling is a documented product limit carried by the
  contract, not a latent defect.
- `packages/core` keeps Zod as its only dependency.
- An external integration that reports decimal strings needs a parser at the
  boundary. That parser is the single place in the system where a decimal
  string becomes an integer, and it is tested against the currency exponent.
- Anything that needs money — the credit card limit, the AI budget of
  [Fase 07](../plans/fifilo/fase-07-fundacao-de-ia.md) — reuses the primitive
  instead of inventing a second representation.

## Revisit when

- Multi-currency with conversion enters the product. A converted amount needs
  a rate and a rate date, which is a second decision, not an extension of this
  one.
- A currency with an exponent above 3 or a non-decimal subdivision is
  supported.
- A workspace legitimately approaches the safe-integer ceiling. Then
  `mode: 'bigint'` plus a wire serializer becomes the cheaper trade.
- Drizzle changes how it maps `bigint` for the `pg` driver.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 012: the contract declares in Zod and the type infers, which is why
  the ceiling lives in the schema.
- Decision 014: a primitive guarantees provenance, not a wire format. `Money`
  follows the same shape as `EntityId`.
- `packages/core/src/primitives.ts`.

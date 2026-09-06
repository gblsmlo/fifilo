# Decision 012: the contract declares in Zod, the type infers, the kernel holds only common ground

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 073; the starter keeps the rule and drops the product-specific evidence.

## Context

Decision 002 fixed where validation happens and where the public contract lives:
`packages/core/src/contracts` holds the HTTP contract, and a capability's port
is plain TypeScript. What it did not fix was the rule inside the contract.

The reference product audited one capability and found the same pair of fields
declared six times: the source schema, a response schema that composed it, a
request schema that rewrote the fields by hand, a repository method that spelled
them out, a use case command that widened one of them to `string`, and the
table. The widening had a measurable consequence: the route already validated
the request, the command threw the type away, and the use case re-parsed to be
able to return an error code that HTTP could never reach. Its only exerciser was
a test forcing an invalid value.

The contrast was the auth contract: forty lines, every type `z.infer`, internal
blocks without `export`, one subject. In the starter,
`packages/core/src/contracts/auth.ts` keeps that shape. `signUpErrorCodeSchema`
and `signUpUserSchema` are private `const`s; only the request, response and
error schemas and their inferred types cross the file boundary.

## Options considered

1. **Leave it to taste.** Each contract author decides how many declarants a
   field has. The sixth declarant is what taste produces.
2. **Schema everywhere**, including ports and use case commands. It validates
   what the compiler already proves, and doubles the cost of every change.
3. **Zod declares at the boundary, everything inside derives**, with a measurable
   rule for what belongs in the kernel.

## Decision

Adopt option 3.

### Zod declares at the boundary; it never mirrors

Zod is the source where the boundary can lie: HTTP request and response, the
row that comes back from the database, imports and caches. There the schema
declares and the type comes out of it.

Inside the process (a port, a use case command, a domain record) plain
TypeScript is correct and does not get a schema. `typecheck` already proves the
two sides match. A schema that only restates what the compiler guarantees is a
mirror, not a contract.

### A hand-written type that a schema already describes is a finding

`type X = z.infer<typeof xSchema>`, always. A variation of a contract derives:
`.partial()`, `.pick()`, `.extend()`. Rewriting the fields is what produces the
sixth declarant.

When the domain shape differs from the wire shape (`Date` against an ISO
string), both exist, but the list of fields is not typed twice.

Corollary: a use case command is typed by the contract, not by a wide
primitive. The Auth handler receives `SignUpRequest`, never `{ email: string;
name: string; password: string }` spelled again.

### Exporting is a decision, not a default

Only what crosses the file boundary is exported. An array that exists to feed
`z.enum()` is a private `const`, as `contracts/auth.ts` does. An export with no
consumer is a finding.

### The kernel holds common ground; the capability holds its own contract

`packages/core/src/contracts/` is the kernel: `auth.ts`, `users.ts`, `health.ts`
today, next to `result.ts`, `errors.ts` and `primitives.ts`. Vocabulary that
more than one capability applies lives there. `publicUserSchema` in `users.ts`
is the example: the Auth capability and any future capability that shows a
person both consume it.

A contract that no other capability consumes lives in the capability, in
`packages/core/src/<capability>/schemas.ts`, published by its own subpath in
`packages/core/package.json` (`./<capability>`), next to the existing
`./contracts/*`, `./errors`, `./primitives` and `./result` entries.

The criterion is measurable: if any file under `packages/core/src/<other>/`
consumes it, it is kernel. If only `apps/` consumes it, it belongs to the
capability.

## Consequences

- Every schema in `packages/core/src/contracts` has an inferred type next to it
  and no hand-written twin. `HealthResponse`, `CurrentUserResponse` and
  `SignUpRequest` are all `z.infer`.
- API routes in `apps/api/src/features/<capability>/` declare `body:` and
  `response:` with the kernel schemas. The handler receives the parsed type and
  does not re-parse.
- Web adapters in `apps/web/src/features/<capability>/http/` import the type
  from `@fifilo/core/contracts/<name>`. They do not restate the shape.
- When the second capability arrives, its private contract goes to
  `packages/core/src/<capability>/schemas.ts` on day one, not to the kernel.
  The kernel is not the default landing place.

## Revisit when

- A port needs runtime validation: an adapter behind a network, a queue or an
  external plugin. Then the first clause changes for that port, and the reason
  is recorded.
- The kernel grows with single-capability contracts. The "who consumes it"
  criterion is not being measured before writing.
- A contract needs domain and wire shapes so different that deriving one from
  the other is less clear than writing both.
- Boundary rules (Decision 001) start to exempt `import type` between
  capabilities. Then part of the kernel can move down to a capability.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decisions 001, 002 and 014 in prose: package boundaries, layered validation,
  and the identifier primitive every contract carries.
- `packages/core/src/contracts/auth.ts`, the reference shape.

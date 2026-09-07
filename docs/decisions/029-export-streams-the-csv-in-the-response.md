# Decision 029: the workspace export streams its CSV in the response body; no server-side file, no expiration job

## Status

Active. Recorded on 2026-09-07 for the Fifilo product domain. Executed in
[Fase 06](../plans/fifilo/fase-06-settings-e-aceitacao.md).

## Context

Fase 06 § Modelagem asks for "CSV de transações com lançamentos, contas,
categorias e faturas do período," gated to owner and admin, with an audit
event per export, and reads `security.md`'s generic retention table literally
enough to name "arquivo gerado com expiração de 24h" as the shape the feature
should take. `security.md`'s own retention table is written for a product that
generates a downloadable artifact ahead of retrieval - a report a user
requests, waits for, and later fetches through a link. Nothing in this starter
already writes to object storage or local disk for any feature; introducing
one for a single CSV endpoint would be the "abstraction justified only by a
possible future" `CLAUDE.md` § Escopo already rules out.

## Options considered

1. **Generate the file, store it (local disk or object storage), return a
   signed link, and run a cleanup job that deletes it after 24h.** Matches
   `security.md`'s retention table literally, but requires a storage
   abstraction, a token scheme for the signed link, and a scheduled job this
   starter has no equivalent of anywhere else - three new pieces of
   infrastructure to satisfy a requirement a synchronous response already
   satisfies without them.
2. **Stream the CSV directly in the response body of the authenticated GET
   request**, the same shape every other read in this API already takes.
   Nothing is written to any durable store, so there is no file whose
   lifetime needs bounding - the response exists only for the duration of the
   request, well under any retention window.

## Decision

Adopt option 2. `GET /api/export/transactions?from=&to=` (Decision 002:
`from`/`to` are Zod-validated query params) calls `exportTransactionsCsv`
(`packages/core/src/export`), which checks `requireExportAccess` (owner or
admin only, sharing the owner-or-admin predicate `requireSettingsWriteAccess`
already established) before reading a row, then returns the CSV text as the
response body with `Content-Disposition: attachment` so a browser downloads
it under a normal filename. An audit event (`workspace.exported`) still fires
on every successful export, satisfying the auditability half of the
requirement regardless of delivery mechanism.

### Why the 24h expiration does not apply here

`security.md`'s retention row exists to bound how long a *stored* artifact
survives after it stops being needed. This feature never stores one: the CSV
is computed from a query and written straight into the HTTP response, so
there is nothing left over for a retention job to find or delete. A future
export large enough to need async generation (queued, emailed, or polled for)
would reopen this decision and its infrastructure cost - Fase 06 § Escopo's
own transaction-period export does not reach that size.

## Consequences

- No new storage dependency, token scheme or scheduled job entered the
  codebase for this feature.
- The export endpoint is a thin adapter like every other route (Decision
  003): parse the query, call the use case, map its `Result` to HTTP or to
  the CSV body.
- `packages/core/src/export/csv.ts` escapes every cell per RFC 4180 and
  guards against formula injection (a leading `=`, `+`, `-` or `@` gets a
  literal-text apostrophe prefix) - the one new risk a spreadsheet-consumed
  export carries that a JSON response never did.
- `export-persistence.integration.test.ts` proves the cross-workspace leak
  Fase 06 § Riscos names by name: two populated organizations, one query each,
  each reader call returns only its own rows.

## Revisit when

- An export needs to span enough data that a synchronous request risks a
  timeout or a memory spike - at that point async generation with real
  storage and the 24h retention this decision opted out of becomes the
  cheaper design, not a premature one.
- A product built on this starter needs a shareable export link (someone
  other than the requester fetching it later) - that is a genuinely different
  requirement (a link with its own authorization) this decision does not
  cover.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 002: validation in the route's Zod schema - `exportTransactionsQuerySchema`
  follows it for `from`/`to`.
- Decision 003: `repository.ts` is a composition root; `export-persistence.ts`
  carries the join, `repository.ts` only wires it to the port.
- Decision 019: the composite key `(organization_id, id)` is the tenant proof
  every join in `export-persistence.ts` keys on.
- Decision 021: the entry is the signed leg - the export's row grain.
- Decision 026 names `requireSettingsWriteAccess` as the first owner/admin-only
  gate; `requireExportAccess` shares its predicate under its own message.

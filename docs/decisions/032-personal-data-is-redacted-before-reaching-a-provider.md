# Decision 032: level 3 and 4 personal data never reaches a model provider as plain text

## Status

Active. Recorded on 2026-09-07 for the Fifilo product domain. Executed in
[Fase 07](../plans/fifilo/fase-07-fundacao-de-ia.md).

## Context

[`security.md`](../../engineering/security.md)'s data classification puts
names, emails and identity documents at Level 3 or 4 - access by role and
need, forbidden in logs and third-party analytics. An external model
provider is exactly that: a third party this codebase does not control once
a request leaves it. Fase 07 § Guardrails #2 names the requirement plainly:
"nome, e-mail, documento e qualquer campo nível 3 ou 4 não saem em texto
para o provedor." NFR-10 makes the same demand of logs; this decision is its
counterpart for the one other place data leaves the process.

## Options considered

1. **Trust each call site to scrub its own prompt before calling an
   `AgentBackend`.** Cheapest to build, and the one guaranteed to be
   forgotten at exactly the call site that matters - the same failure mode
   Decision 026 already rejected for authorization ("decided in the use
   case, not left to whichever route remembers to check").
2. **A shared, tested redaction gate every `AgentInput` passes through
   before a provider ever sees it**, with a stable opaque reference
   replacing each redacted value so the server can resolve it back once the
   response returns - never in view of the provider.

## Decision

Adopt option 2. `redactPersonalData` (`packages/ai/src/redaction.ts`) takes
an `AgentInput` and the caller's own set of `knownValues` (names and
identifiers already loaded for this run - an account holder's name, an
organization member's name) and returns the input with every occurrence
replaced by a stable `[ref:N]`, plus the `entries` mapping each reference
back to its real value. Email addresses and CPF/CNPJ-shaped numbers are
redacted unconditionally, as a regex-based safety net independent of
`knownValues` - a fail-safe, not a validator: a false positive costs an
opaque reference, a false negative costs a document number reaching the
provider.

### Reference resolution happens only on the way back, only on the server

The redacted `[ref:N]` is what a provider reads and what a provider writes
back in its own response; resolving a reference to the real value it stands
for is this codebase's own job, done after the response returns, never
transmitted to the provider in either direction.

## Consequences

- Every `AgentBackend.run` call (Fase 08 onward) redacts its `AgentInput`
  before constructing the request; `packages/ai` guarantees the mechanism
  exists and is tested, not that every future call site remembers to invoke
  it - the same caveat every use-case-level guard in this codebase already
  carries (Decision 026's own precedent).
- The same value always maps to the same reference within one
  `redactPersonalData` call, so a name mentioned in both the system prompt
  and a user message reads as the same placeholder throughout - a provider
  can still reason about "the person named [ref:1]" across a whole
  conversation without ever learning who that is.
- `redaction.test.ts` proves a known name, an email and a CPF-shaped
  document all disappear from the output, that a never-mentioned known
  value adds no entry, and that ordinary financial text is untouched.

## Revisit when

- A provider capability needs the real name back mid-conversation (a tool
  call the provider itself must address to a specific person) - that is a
  materially different requirement (selective, audited disclosure) this
  decision does not cover and would need its own guardrail.
- The regex-based document pattern proves too narrow or too broad for a
  jurisdiction this product expands into - the known-values pass stays the
  primary mechanism; the regex pass is deliberately a secondary net.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 026: authorization decided in the use case, not left to the
  route - the same reasoning applied here to redaction instead of access
  control.
- Decision 030: the port `redactPersonalData` sits alongside, both living in
  `packages/ai`.
- `docs/engineering/security.md`'s data classification, and NFR-10, this
  decision is the AI-facing half of.

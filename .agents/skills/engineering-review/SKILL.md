---
name: engineering-review
description: twincam review criteria for PR audits and follow-up fixes — canonical sources to read first, identifier-boundary and contract rules, and what counts as a finding. Use when reviewing a twincam pull request or auditing a follow-up fix.
scope: twincam
source: project-local
---

# engineering-review

> **Source of this skill:**
> [`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md), which
> names the active source of every boundary, and the decisions it cites. This
> skill does not restate the rules; it says which ones a reviewer checks, in
> which order, and what counts as a finding.

## How the review runs

Run the review in a **fresh context** that sees the diff and these criteria, not
the reasoning that produced the change: `/code-review`, or a subagent given the
diff plus this file. A reviewer that already holds the author's rationale
re-approves it.

Report only what affects **correctness or a requirement declared** in the
canonical sources below. A reviewer told to find gaps will invent them, and
chasing every observation produces over-engineering. Residual doubt goes under
open questions, not into the findings list.

## Use this skill when

- Reviewing twincam pull requests.
- Auditing follow-up fixes that must stay aligned with the repo's active sources.
- Checking package boundaries, identifier boundaries, contract consumption and
  PR traceability.

## Do not use this skill when

| Situation | Where to go |
| --- | --- |
| The task is running the checks, not judging the diff | [`engineering-validation`](../engineering-validation/SKILL.md) |
| A whole vertical must be audited against the architecture, beyond one diff | [`engineering-refactor`](../engineering-refactor/SKILL.md) |
| The question is where a component lives and who may import it | [`design-system`](../design-system/SKILL.md) |
| The diff touches session, cookies, route guards or the auth guard | [`auth`](../auth/SKILL.md) |
| The how of one technology: React, Drizzle, HTTP, Elysia, `bun test`, Playwright, stories | `react-review` · `drizzle-review` · `http-review` · `elysia-diagnose` · `bun-test-review` · `playwright-review` · `storybook-test` |
| The review target is outside this repository | not this skill |

## Review order

1. Read the canonical sources first.
2. Confirm the implementation stays inside the repo boundaries.
3. Check tests, validation and traceability before approving.

## Canonical sources

| Read | For |
| --- | --- |
| [`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md) | precedence, responsibilities, the active source of each boundary |
| [`docs/engineering/architecture.md`](../../../docs/engineering/architecture.md) | stack, organizations, identifiers at the persistence boundary, security baseline |
| [`docs/engineering/component-ownership.md`](../../../docs/engineering/component-ownership.md) | where a frontend component lives |
| [`docs/engineering/testing.md`](../../../docs/engineering/testing.md) · [`test-plan.md`](../../../docs/engineering/test-plan.md) § 5.1 and § 8 | which layer tests what, and the definition of done |
| Decision 001, 002, 006, 007, 012, 013, 014 | boundaries, layered validation, ownership, feature shape, Zod-first contracts, Eden, opaque ids |
| [`.github/pull_request_template.md`](../../../.github/pull_request_template.md) | the Boundaries and Validation checklists the PR must satisfy |
| `packages/core/src/contracts` | the public contracts the diff must consume, not redeclare |

Decisions are cited by number and resolved through the
[decisions index](../../../docs/decisions/README.md), never by file path.

## Review rules

### Boundaries (Decision 001, Decision 006)

- Packages resolve each other only through published `exports`; an import of an
  internal path of `packages/*` is a finding.
- `packages/core` stays free of Elysia, Drizzle, Better Auth and infra packages.
- A root barrel initializes no runtime: env, database, auth and logger come
  through explicit subpaths (`@twincam/infra-env/server`,
  `@twincam/infra-database/client`, `@twincam/auth/server`).
- Component direction is `ui` → `patterns` → `layouts` → `features`; a neutral
  component born in `apps/web/src/features/<x>` or in `apps/web/src/components`
  is a finding. Route the details to [`design-system`](../design-system/SKILL.md).
- A Web feature imports another only through its `index.ts`; its internal shape
  follows `apps/web/src/features/auth` (Decision 007).

### Contracts and data flow (Decision 002, Decision 012, Decision 013)

- The contract declares in Zod under `packages/core/src/contracts/*`; the type
  infers. A hand-written type parallel to a schema is a finding.
- Web reaches the API through the Eden client `api` in
  `apps/web/src/libs/api-client.ts`, never through a literal route path or a
  raw `fetch` of an API URL. Status comparison goes through `edenStatus`;
  routes whose success is not `200` go through `edenCreated`. A route never
  changes its status to please the client.
- If a change alters behavior declared in an active source, the source is
  updated before or alongside the code.

### Identifier boundaries (Decision 014)

- An id is an opaque string. `EntityId` in `packages/core/src/primitives.ts`
  guarantees provenance through `entityId()`, not format: a regex, `slice`,
  sort or comparison that depends on the shape of an id is a finding, and so
  is `.uuid()` in a schema.
- Flag new raw identifier parameters such as `organizationId: string`,
  `userId: string`, `actorUserId: string` or `memberId: string` in Core, API
  adapter, repository, route context, cache-key and storage-key boundaries when
  a canonical type exists.
- Prefer source-derived types: `EntityId`, Zod-inferred types from
  `packages/core/src/contracts/*`, indexed access types from contracts, and
  explicit aliases for persistence, cache and storage keys.
- Accept raw strings only at unparsed external edges (a Better Auth session
  payload, request params before Zod) or when the PR documents that no
  canonical type exists.
- When a helper maps a public id into an internal persistence or cache key,
  the return type is named as the internal key and is not presented as the
  public id.

### Tenant and session (Decision 005, `auth` skill)

- Organization identity comes from the validated session through
  `createAuthGuard` / `requireActorContext` in
  `apps/api/src/features/auth/actor-context.ts`, never from a client header,
  query string or body.
- A tenant-aware database change carries negative coverage: two organizations,
  no-context access, `WITH CHECK`, rollback.

### Tests (Decision 008, Decision 009)

- One behavior has one layer. A `.test.tsx` and a story with `play` asserting
  the same thing is a finding; keep the one the criterion in `test-plan.md`
  § 5.1 picks, not the newer one.
- A published primitive or pattern without a story is a delivery without a
  component test.
- The PR's Validation section names what ran; a check listed as green without
  evidence is a finding for [`engineering-validation`](../engineering-validation/SKILL.md).

## Review output

- Findings must be ordered by severity.
- Include file references for every finding.
- Mention open questions and residual risks after the findings.
- If there are no findings, say that explicitly.
- A finding about product behavior is not a finding here: record the open
  question for the product built on this starter; this starter does not decide
  product behavior.

## Follow-up fixes

- Keep fixes small and branch-local.
- Update the PR after implementation changes are pushed.
- Do not let the review path drift away from the documented active sources.

## Self-verification

| # | Check | Source |
| --- | --- | --- |
| 1 | The review ran in a fresh context with the diff and this file | this skill |
| 2 | Every finding cites a canonical source or a decision number | `docs/00-architecture-map.md` |
| 3 | Boundaries checklist of the PR template holds for the diff | `.github/pull_request_template.md` |
| 4 | No literal API path, no raw status compare, no re-parsed `200` body in Web | Decision 013 |
| 5 | No id shape assumption, no `.uuid()`, no new raw id parameter where a type exists | Decision 014 |
| 6 | No behavior asserted twice across `bun test` and a story `play` | Decision 008, Decision 009 |
| 7 | Findings ordered by severity, each with a file reference; open questions separate | this skill |

## Anti-patterns

| Anti-pattern |
| --- |
| Reviewing with the author's rationale still in context |
| Reporting observations that no canonical source declares as a requirement |
| Approving a diff whose active source was not updated with the behavior change |
| Accepting `fetch('/api/...')` in Web because it works |
| Treating `error.status === '401'` as correct because it compiles |
| Deciding product behavior inside a review finding |

## Closing

1. **Hand over.** Structural debt the review exposes across a whole vertical
   goes to [`engineering-refactor`](../engineering-refactor/SKILL.md); a check
   that did not run goes back to [`engineering-validation`](../engineering-validation/SKILL.md).
2. **A boundary in dispute becomes a decision** under `docs/decisions/`, cited
   by number, not a local exception in the PR.
3. **Open questions stay listed**, with an owner, after the findings.

## Related

- [`docs/00-architecture-map.md`](../../../docs/00-architecture-map.md), the source
- [`docs/engineering/architecture.md`](../../../docs/engineering/architecture.md) · [`component-ownership.md`](../../../docs/engineering/component-ownership.md) · [`testing.md`](../../../docs/engineering/testing.md)
- [`engineering-validation`](../engineering-validation/SKILL.md) · [`engineering-refactor`](../engineering-refactor/SKILL.md) · [`design-system`](../design-system/SKILL.md) · [`auth`](../auth/SKILL.md)
- [Decisions index](../../../docs/decisions/README.md), Decisions 001, 002, 005, 006, 007, 008, 009, 012, 013, 014

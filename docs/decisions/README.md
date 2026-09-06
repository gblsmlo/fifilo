# Decisions

Decisions record the reason behind cross-cutting choices with relevant
alternatives and a cost of reversal. The architecture map and the guides
declare the current state; this directory is neither a backlog nor a changelog.

**This index is the resolver.** The decision number is the stable address; the
file name may change and the decision may move to `archive/`. Cite
`Decision NNN` and link this index; never address the file directly.

The **State** column says whether it is worth opening:

- **active**: current authority.
- **active · refined by NNN**: still valid; read the refiner too, because it
  narrows or extends the scope.
- **historical · see NNN**: lives in [`archive/`](archive/) and does **not**
  guide new code. It stays for the recorded trade-off, not for the rule.

A decision moves to `archive/` only when its own Status declares it replaced and
the successor exists; the successor adds its own row here.

## Active

| # | Decision | State |
| ---: | --- | --- |
| 001 | [package boundaries and dependency ownership](001-package-boundaries-and-dependency-ownership.md) | active |
| 002 | [data flow, and what each layer validates](002-data-flow-and-layered-validation.md) | active |
| 003 | [`repository.ts` is a composition root](003-persistence-adapter-composition.md) | active |
| 004 | [Drizzle-first data access, raw SQL as a justified exception](004-drizzle-first-data-access.md) | active |
| 005 | [Elysia route module scope: guard is `scoped`, derives are `local`](005-elysia-plugin-scope.md) | active |
| 006 | [component ownership: `ui` → `patterns` → `layouts` → `features`, shell versus showcase](006-component-ownership-ladder.md) | active |
| 007 | [the model feature structure in Web](007-feature-structure-in-web.md) | active |
| 008 | [one runner per test layer](008-one-runner-per-test-layer.md) | active |
| 009 | [Storybook is a test layer, not a catalog](009-storybook-is-a-test-layer.md) | active |
| 010 | [the Atomic Design ladder orders the catalog](010-atomic-ladder-orders-the-catalog.md) | active |
| 011 | [Storybook controls declared in `argTypes`, descriptions stay in JSDoc](011-storybook-controls-by-argtypes.md) | active |
| 012 | [the contract declares in Zod, the type infers, the kernel holds only common ground](012-contract-declares-in-zod-type-infers.md) | active |
| 013 | [Web consumes the API through the executable contract](013-web-consumes-the-api-through-the-executable-contract.md) | active |
| 014 | [the id is an opaque string](014-id-is-an-opaque-string.md) | active |
| 015 | [documentation is addressed by index; superseded decisions move to `archive/`](015-docs-addressed-by-index.md) | active |
| 016 | [a parent issue exists only when there are two or more independent deliveries](016-decomposition-gate.md) | active |

## Historical

| # | Decision | Replaced by |
| ---: | --- | --- |

## Recording a new decision

Record a decision when a change alters an invariant, a shared contract, a
bounded-context boundary, an ownership model or an irreversible workflow.
Include context, options, trade-offs, consequences and revisit triggers. Number
it with the next free number, add its row here, and cite other decisions by
number in prose, never by file path.

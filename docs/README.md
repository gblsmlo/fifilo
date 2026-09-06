# Twincam documentation

The entry point to understand the starter without reconstructing its history.
A document holds only what only it holds: when a rule lives in a decision or a
guide, other documents point to it instead of repeating it.

| Question | Source |
| --- | --- |
| How is the system built, and which source governs each boundary? | [Architecture map](00-architecture-map.md), then [Technical architecture](engineering/architecture.md) |
| Why was a cross-cutting choice made? | [Decisions](decisions/README.md) |
| Which known defects have reproducible evidence? | [Known bugs](bugs/README.md) |
| Where does a frontend component live, and who may import it? | [Component ownership](engineering/component-ownership.md) |
| Which environment variables exist, and who reads them? | [Environment](engineering/environment.md) |
| How do we log, trace and audit? | [Observability](engineering/observability.md) |
| How do the image, the hooks and CI work? | [Toolchain, image and CI](engineering/toolchain.md) |
| How do I implement changes inside `packages/`? | [Packages implementation guide](engineering/packages-implementation-guide.md) |
| How do I implement changes in the API? | [API implementation guide](engineering/api-implementation-guide.md) |
| How do I decide and validate persistence? | [Drizzle-first persistence](engineering/drizzle-first-persistence.md) |
| How do I deliver a feature end to end? | [Feature delivery flow](engineering/feature-delivery-flow.md) |
| What is tested, and at which layer? | [Testing](engineering/testing.md) and [Test plan](engineering/test-plan.md) |
| How do we protect access and data? | [Security](engineering/security.md) |
| Idempotency, migrations and rollout? | [Operation](engineering/operation.md) |
| What is being worked on now? | [Plans](plans/) hold the current update plan; the tracker of the product built on this starter owns execution |
| What is the product roadmap, phase by phase? | [Fifilo roadmap](plans/fifilo/README.md) |

## Authority

- `AGENTS.md` holds the executable rules for working in the repository.
- `docs/00-architecture-map.md` names the active source for each boundary.
- `docs/decisions/` explains only cross-cutting, durable choices that are costly
  to reverse. Cite them as `Decision NNN` and link the index; file names change,
  numbers do not.
- `docs/engineering/` keeps the technical model that no decision governs.
- The database schema is read from `packages/infra/database/src/schema.ts`,
  never from a prose dictionary: prose describing tables ages worse than absence.
- `docs/plans/` and Git history are evidence and context. They do not authorize
  new structure or behavior.

## Rule for technical changes

Local, reversible details are decided during implementation. A change to a
shared algorithm, a dependency, a contract, a validation rule, ownership or an
architectural boundary follows the current documentation. When the choice is
durable and undocumented, propose it as a decision before implementing it.

## Skills

Repository skills live in `.agents/skills/` and are exposed to Claude Code
through `.claude/skills`, a symlink to that folder. They decide **what** to do
in this repository: `engineering-contract` → `engineering-persistence` →
`engineering-api` → `engineering-web` is the build order of a vertical slice;
`engineering-validation`, `engineering-review` and `engineering-refactor` close
it; `auth` and `design-system` cover the two areas the starter ships.

Technology skills (React, TanStack, Elysia, Drizzle, Bun, HTTP, Playwright,
Storybook) are installed globally from the maintainer's vault and are cited by
name, without a link. They add procedure; a decision or guide in this repository
always wins over them.

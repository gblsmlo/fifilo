# Component ownership

Where a component lives, and who may import it. The boundary is the component's
**responsibility**, not the page where it was born.

The normative rule, its triggers and the shell versus showcase ruler are
Decision 006 in [`docs/decisions/README.md`](../decisions/README.md). This table
is the active map of the layers, kept against what exists in the workspace.

## The five layers

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `packages/ui/src/components` | reusable, domain-neutral visual primitive | `Button`, `Field`, `Dialog`, `Empty`, `Spinner` |
| `packages/patterns/src` | reusable neutral composition with a stable visual or interaction contract | `StateSurface`, `StateGuard`, `Dialog` shell, `ConfirmDialog`, `DestructiveDialog`, `PasswordStrength`, `SettingsRow` |
| `apps/web/src/layouts` | global shell coupled to router, session, navigation or app chrome | `AppLayout`, `AppHeader`, `AppSidebar`, `AppAuthLayout` |
| `apps/web/src/components` | page structure exclusive to the web app | `Page`, `PasswordField` |
| `apps/web/src/features/<feature>` | UI with the vocabulary, data or behavior of one capability | `SignInFormFields`, `OrganizationOnboardingPage` |

## Shell versus showcase

A **shell** belongs to `packages/patterns`: the frame that does not know what it
carries. It decides position, hierarchy, density, visual states and
accessibility semantics; it knows nothing about a route, a mutation, a cache, a
permission or a domain word. It receives content and callbacks.

A **showcase** belongs to `apps/web/src/features/<feature>`: it knows which
fields, which copy, which mutation, which permission. It composes shells; it
never redraws a frame and never redeclares a state. The surface state
vocabulary (`loading`, `empty`, `error`, `permission`, `ready`) lives once in
`@fifilo/patterns/state-kinds`.

A domain-neutral shell goes to `packages/patterns` without waiting for a second
consumer. What requires a second consumer is generalizing a shell's API, not
creating it.

## The rules the table does not show

- **Do not decide the layer by consumer count.** A neutral component belongs to
  the package at its first use; a component with domain vocabulary stays in the
  feature even when five pages use it.
- **Consume through explicit public exports.** Every package publishes subpaths
  in its `exports`; `packages/ui` has no root barrel. Importing an internal path
  of `packages/*` is a review finding.
- **`apps/web/src/components` is not a second UI library.** A neutral component
  that appears there either moves up to the package or gains an application
  responsibility that justifies staying.
- **A wrapper must add real responsibility**: router, session, authorization,
  data or a domain presentation rule. A wrapper that only passes props through
  is a copy in disguise.
- **A story is an obligation for whatever `packages/*` publishes.** Stories live
  in `apps/storybook/src/stories/<layer>`, never next to the component.
- **A component mounted in a story does not read the route.** A shell receives
  the ready link or callback as a prop.

## Shared versions

`react`, `react-dom`, `@base-ui/react`, `class-variance-authority` and
`lucide-react` are declared once in the root `workspaces.catalog`; `ui`,
`patterns`, `web` and `storybook` reference them as `catalog:`. React and Base UI
are peer dependencies of `ui` and `patterns`, supplied by the consumer.

Tailwind scans by file path, not by package: every consumer that lists
`packages/ui/src` in an `@source` directive lists `packages/patterns/src` too.

## Legacy

A new component follows this taxonomy immediately. When touching a legacy
component that diverges, migrate it when the scope is local and safe; with
cross-cutting impact, record the migration instead of inflating the delivery.

## Related

- [`docs/decisions/README.md`](../decisions/README.md): Decisions 006, 007, 009, 010
- [`docs/00-architecture-map.md`](../00-architecture-map.md): the map of active sources
- The `design-system` skill drives the decision of where a component lives

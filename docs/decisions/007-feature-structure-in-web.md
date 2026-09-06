# Decision 007: the model feature structure in Web

## Status

Active. Adapted on 2026-09-06 from the reference product's decision 048; the starter keeps the rule and drops the product-specific evidence.

## Context

A feature under `apps/web/src/features/*` needs a shape that every new
capability can copy without discussion. Without one, the reference product
accumulated deviations that no rule covered: a second functionality living
inside a feature because it read the same data, a `components/` folder with
no internal boundaries, top-level folders holding one file each, a page file
with two exports, and dead components with no consumer, test or story.

The starter has one capability, Auth, and it is the model. Every rule below is
stated for `apps/web/src/features/auth` and applies to the next feature the
same way.

## Options considered

1. **Free form per feature.** No coordination cost, but each feature invents
   its own layout and reviewers cannot tell structure from drift.
2. **Group by type in every feature immediately** (`forms/`, `dialogs/`,
   `actions/` always present). Predictable, but produces empty folders and
   speculative structure in small features.
3. **One model tree, groups created only when they have real content, and one
   feature per functionality.**

## Decision

Adopt option 3.

### Functionality defines the feature

A feature is a functionality: its own routes, its own navigation entry, its own
pages. Reading the same collection or calling the same endpoint does not make
two functionalities one feature. `features/users` exists because the current
user is a functionality of its own, even though Auth resolves the same
session. When a second functionality grows inside a feature, it moves out to
its own `features/<name>/` and imports the first one through its public
modules only.

### The model tree

```text
apps/web/src/features/<feature>/
  index.ts              public API of the feature: what routes import
  route-search.ts       Zod contract of the URL (when a route has search)
  query-options.ts      shared query options (when loader and hooks share a resource)
  <domain>.ts           pure domain modules at the root
                        (auth: feedback.ts, password-requirements.ts, route-guard.ts)
  http/                 pure HTTP adapters over the Eden client
                        (auth: sign-in.ts, sign-up.ts, sign-out.ts, two-factor.ts, errors.ts)
  hooks/                hooks exclusive to the feature (auth: use-sign-in-form.ts, ...)
  schemas/              client form schemas, a UX layer over the contract
  utils/                small pure helpers with their own tests (auth: redirect.ts)
  pages/                route wiring and page compositions (auth: sign-in-page.tsx, ...)
  components/           visual blocks with no knowledge of the router
    forms/              the forms (auth: sign-in-form.tsx, sign-up-form.tsx, ...)
    dialogs/            feature dialogs, wiring over @fifilo/patterns shells
    <clear group>/      other groups only when 2+ pieces of one family exist
    (root)              what has no clear group stays at the root
  storybook/            fixtures consumed by the catalog and tests, outside production
                        (auth: auth-story-fixtures.ts)
```

### Rules

- **Never create an empty or speculative folder.** `dialogs/` does not exist
  in Auth because Auth has no dialog. `route-search.ts` and
  `query-options.ts` exist only when a route has search params or a shared
  resource. A small feature with a few files at the root is already in the
  model shape.
- **One tier per file in `pages/`.** A page file exports one composition. The
  route file under `apps/web/src/routes/(auth)/*.tsx` imports it from
  `@features/auth` and does only loading, redirects and composition.
- **Routes import `index.ts`.** `index.ts` lists what routes need:
  `SignInPage`, `SignUpPage`, `ForgottenPasswordPage`, `ResetPasswordPage`,
  `TwoFactorPage`, `signOut`. Deep imports from a route into a feature are a
  review finding. Another feature imports only a deliberately public module
  (`@features/users/current-user` is the example).
- **The catalog reaches inside.** Stories under
  `apps/storybook/src/stories/features/auth` import components, hooks,
  schemas and `storybook/` fixtures by their path. The catalog is not a route;
  it documents the component, so it needs the component.
- **`components/` knows no router.** Navigation, search params and loaders
  belong to `pages/` and `route-guard.ts`. A form receives callbacks.
- **`http/` is pure.** Each module wraps one Eden call (Decision 013), maps
  the Eden result and throws or returns the feature's own error types from
  `http/errors.ts`. No React, no router.
- **Dead code is deleted, not kept.** A component with no consumer, test or
  story does not stay for a future need.
- **Naming.** Files are kebab-case and say what they are: `sign-in-form.tsx`,
  `use-sign-in-form.ts`, `sign-in-page.tsx`. A wiring page and a free
  composition of the same entity get distinct names, never one file with two
  exports.

## Consequences

- A new capability copies the Auth tree and deletes what it does not need.
  Reviewers compare against one shape.
- Route files stay thin. Everything a route needs comes from `index.ts`.
- Storybook fixtures live with the feature but outside its production tree, so
  the catalog and the tests share them without shipping them.
- Splitting a second functionality out of a feature costs a move and an import
  change, not a redesign, because the public modules are already named.
- An empty folder, a speculative group or a route importing a deep path is a
  review finding.

## Revisit when

- A group name in `components/` starts colliding with a pattern's vocabulary
  (for example a `surfaces/` group next to `StateSurface`).
- Two features need the same content and the shared module has no owner.
- A feature grows past the point where one `index.ts` can name its public
  surface, which suggests it holds more than one functionality.
- TanStack Start changes how file routes and feature modules relate.

## Related

- [`docs/decisions/README.md`](README.md) resolves number → file → state.
- Decision 006 fixes which pieces belong to `patterns` instead of the feature.
- Decision 013 fixes the Eden client the `http/` modules wrap.
- Decision 016 fixes the gate a feature passes before it is split.

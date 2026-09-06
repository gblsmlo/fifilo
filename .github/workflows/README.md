# CI: decisions that are not obvious in the YAML

## Every test layer runs

`quality` runs lint, typecheck and `bun test`; `storybook` runs every story in
headless Chromium; `e2e` runs the Playwright journeys against a seeded
database. A verification that does not run in CI is not a merge guarantee, so
the three layers are three jobs, each with its own timeout, all gated on
`quality`.

## `.env` on the runner

`scripts/ci-env.sh` writes the `.env` the runner does not have, with the same
public placeholders as `.env.example`. The server env schema throws without
them, and both `drizzle-kit` and the `--env-file` flags in the test scripts read
that file rather than the process environment.

## Job `storybook`

- **Installs Playwright from `apps/storybook`, not from the root.** The root
  depends on `@playwright/test`; `apps/storybook` depends on `playwright`,
  pinned to match `@vitest/browser-playwright`. Each package resolves its own
  `playwright-core`, and each version downloads a different browser revision.
  Installing from the root downloads the wrong revision for the component tests,
  which then fail with "Executable doesn't exist" only in CI, because a local
  cache from an earlier `test:e2e:install` masks the problem.
- **`@storybook/addon-vitest` boots Storybook itself** through
  `storybookScript` in `apps/storybook/vitest.config.ts`. The job has no manual
  start or wait step.

## Job `e2e`

The API and the web dev server start from `playwright.config.ts` on ports the
runner owns. The report and traces are uploaded only on failure, for seven days.

## Hooks are repeated on purpose

`lint:ci` and `typecheck` also run in `pre-push`. CI repeats them because local
hooks can be skipped; `concurrency` per ref cancels a run that a newer push
made stale.

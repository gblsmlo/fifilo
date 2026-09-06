---
name: engineering-validation
description: Validate code changes in the fifilo repository with the correct Bun/Biome toolchain, running focused checks first then repository checks proportionally, and reporting environmental blockers honestly. Use after every code change before committing or opening a PR.
scope: fifilo
source: project-local
date_added: "2026-09-06"
---

# engineering-validation

Use this skill after every code change in the fifilo repository, before
committing or opening a PR. It keeps validation proportional to the change and
honest about what actually ran.

> **Source of this skill:**
> [`docs/engineering/testing.md`](../../../docs/engineering/testing.md)
> § Repository validation, and
> [`docs/engineering/test-plan.md`](../../../docs/engineering/test-plan.md)
> § 7 for the layers CI must contain. One runner per test layer is Decision 008.

## Principle: proportional validation

Run the **focused** checks that cover the changed boundary first, then the
repository checks required by that boundary. Do not claim a check is green if
it did not run.

If the environment prevents a check (missing service, wrong runtime, no
network, no Chromium), report the exact command, result, cause, impact and
missing evidence instead of hiding it behind a green summary. Blockers are a
finding, not a reason to stop reporting.

## Always start with the toolchain

Before diagnosing lint, type or tooling failures, run:

```sh
sh scripts/check-toolchain.sh
```

The repo pins Bun through `packageManager` in `package.json` (`1.3.14`) and
Node through `.node-version` (`24.18.0` LTS). Use the official Bun runtime
(resolved as `~/.bun/bin/bun`), not a Bun installed via NVM/npm. A broken or
wrong-version runtime causes many validation failures; check it first.

## TypeScript / Bun validation

- Lint the repository: `bun run lint:ci`
- Lint and fix a single file: `bunx biome check --write path/to/file`
- Format a single file: `bunx biome format --write path/to/file`
- Typecheck: `bun run typecheck`
- Unit/integration tests: `bun run test` (fans out to every `@fifilo/*`
  workspace that declares a `test` script)
- One workspace only: `bun --filter @fifilo/web test`
- Whitespace hygiene in the working tree: `git diff --check`

Use the exact commands above. Do not substitute `npm run ...` or `npx tsc`
for the fifilo toolchain: the package manager is Bun and the linter/formatter
is Biome.

### Runner flags per workspace

| Workspace | Command its `test` script runs | Why |
| --- | --- | --- |
| `apps/web`, `packages/ui`, `packages/patterns` | `bun test --isolate --timeout 20000` | jsdom plus `mock.module`; without `--isolate` mocks leak between files and produce dozens of false failures |
| `apps/api` | `bun test --env-file ../../.env` | integration tests need PostgreSQL and the root `.env` |
| `packages/observability`, `packages/infra/env` | `bun test` | pure modules |

Never run the DOM workspaces with a bare `bun test` and trust the result.

## Proportional to the change

| Changed | Run | Prerequisite |
| --- | --- | --- |
| Anything | `bun run lint:ci`, `bun run typecheck`, `bun run test` | `docker compose up -d postgres`, `bun run db:migrate` for the API integration layer |
| A component, pattern or story | `bun run storybook:test` | Chromium installed once with `bun run test:e2e:install`; the runner is `@storybook/addon-vitest` in headless Chromium |
| A route, session or persistence journey | `bun run test:e2e` | PostgreSQL, `bun run db:migrate`, `bun run db:seed`; the runner owns Web `3100` and API `3101`, `E2E_PORT_OFFSET` shifts both, `E2E_ENV_FILE` picks the env file |
| A Dockerfile, Compose file or runtime package boundary | `bun run build`, `docker compose build` | Docker daemon |
| A tenant-aware database change | negative coverage with two organizations, no-context access, `WITH CHECK` and rollback, in the API integration layer | real PostgreSQL |

`bun test` never executes stories, and a story never replaces an E2E: one
behavior has one layer (Decision 008, Decision 009).

## The quality loop

1. Write/edit code.
2. Run the focused check for the affected area, then the applicable repository
   check (`bun run lint:ci`, `bun run typecheck`, and any test layer the table
   above requires for the change).
3. Analyze the output: failures must be understood, not papered over.
4. Fix and repeat until the checks pass or the failure is a documented
   environmental blocker with exact evidence.

## Error handling

- If lint fails: fix the style or syntax issue with `bunx biome check --write <path>`.
- If typecheck fails: correct the type mismatches before proceeding.
- If a tool is missing: check the runtime with `sh scripts/check-toolchain.sh`
  and reinstall with `bun install` before assuming a code problem.
- If an integration test fails naming PostgreSQL: start the service and
  migrate; the layer fails naming the prerequisite, never silently.
- If `storybook:test` cannot launch a browser: `bun run test:e2e:install`.
- If an environment blocker prevents a check: record the exact command, result,
  cause, impact and missing evidence in the PR; never report the check as green.

## Running a check is not writing one

This skill runs the checks the repository already has. Writing or repairing a
test is a different job:

| Situation | Where to go |
| --- | --- |
| Decide which level a behavior is tested at, and derive the cases | `teste-design` |
| Write a unit or integration test under `bun test` | `bun-test-build` |
| Review an existing `bun test` suite, or a test that only fails in the suite | `bun-test-review` |
| Write an end-to-end journey | `playwright-build` |
| Audit the E2E suite, or diagnose a flaky spec | `playwright-review` · `playwright-diagnose` |
| Judge whether the suite as a whole protects anything | `teste-review` · `teste-diagnose` |
| Write or review a Storybook story, or the interaction test inside it | `storybook-story` · `storybook-test` |
| Review the diff against the house criteria | [`engineering-review`](../engineering-review/SKILL.md) |
| Audit a whole vertical against the boundaries | [`engineering-refactor`](../engineering-refactor/SKILL.md) |

## Self-verification

| # | Check | Source |
| --- | --- | --- |
| 1 | `sh scripts/check-toolchain.sh` ran before any lint or type diagnosis | `docs/engineering/testing.md` |
| 2 | `bun run lint:ci`, `bun run typecheck` and `bun run test` ran, with output read | `docs/engineering/testing.md` |
| 3 | Every extra layer the change requires ran, by the proportional table | `docs/engineering/test-plan.md` § 7 |
| 4 | DOM workspaces ran with `--isolate --timeout 20000`, through their `test` script | `docs/engineering/test-plan.md` § 2 |
| 5 | No check reported green that did not run; blockers carry command, result, cause, impact, missing evidence | this skill |
| 6 | No `npm`/`npx` substitution for a Bun/Biome command | `docs/engineering/toolchain.md` |
| 7 | `git diff --check` clean | this skill |

## Anti-patterns

| Anti-pattern |
| --- |
| Reporting a green summary for a check that did not run |
| Diagnosing lint or type failures before checking the runtime |
| Running `bun test` without `--isolate` in `apps/web`, `packages/ui` or `packages/patterns` |
| Running every layer for every change, or skipping the layer the change requires |
| Treating a missing PostgreSQL or Chromium as a code failure |
| Writing a new test inside a validation pass instead of routing to the test skill |

## Closing

1. **Hand over.** Before the PR, the diff goes to
   [`engineering-review`](../engineering-review/SKILL.md).
2. **Record the blockers** in the PR's Validation section, one line per check
   that could not run, with the evidence that is missing.
3. **A layer CI does not run is not a merge guarantee.** If the change needs a
   layer the pipeline lacks, that is a finding for the pipeline, not a reason
   to skip the layer locally.

## Related

- [`docs/engineering/testing.md`](../../../docs/engineering/testing.md), the source
- [`docs/engineering/test-plan.md`](../../../docs/engineering/test-plan.md), layers, flags, CI and the definition of done
- [`.github/pull_request_template.md`](../../../.github/pull_request_template.md), the Validation checklist the PR carries
- [`engineering-review`](../engineering-review/SKILL.md) · [`engineering-refactor`](../engineering-refactor/SKILL.md)
- [Decisions index](../../../docs/decisions/README.md), Decision 008 and Decision 009

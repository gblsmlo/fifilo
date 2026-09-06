# E2E runner

Playwright journeys across routes, session and persistence. This is the layer
for what neither `bun test` nor a Storybook `play` can prove: a real session
cookie, a redirect decided by the server, data that survives navigation.

## Structure

- `auth.setup.ts`: signs the seeded owner in through the API and writes the
  `storageState` the `chromium` project injects into every spec.
- `helpers/app-test.ts`: the `test` fixture every spec imports instead of
  `@playwright/test`. It waits for React hydration after each `goto`; a click
  before hydration is lost silently, and `networkidle` never settles with the
  Vite websocket.
- `helpers/auth.ts`: the seeded owner and the sign-in helper.
- `<area>/*.spec.ts`: journeys grouped by area.

## Local setup

```sh
bun run test:e2e:install        # Chromium, once
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run test:e2e
```

The runner owns Web port `3100` and API port `3101` by default. Override them
with `E2E_WEB_PORT` and `E2E_API_PORT`; for concurrent local runs set
`E2E_PORT_OFFSET` and Web takes `3100 + offset * 2`, the API the next port.
`E2E_ENV_FILE` points to another `.env`, `E2E_BASE_URL` skips the web servers
and targets a running deployment.

## Auth coverage and its declared gap

`auth/password-sign-in.spec.ts` covers the password provider: a valid seeded
credential opening the dashboard with a real session, a credential the server
rejects, the show/hide password toggle, and the links between login and
sign-up. These specs start from an empty `storageState`: the subject is
authentication itself, so the seeded session would defeat them.

`auth/organization-onboarding.spec.ts` covers first access: sign-up then login
lands on `/onboarding` instead of an empty dashboard, creating an organization
lands the creator on `/dashboard` operating, and revisiting `/onboarding`
redirects back instead of offering a second organization.

The full password recovery journey is not covered, and cannot be: the starter
ships no email provider, so no reset token is ever delivered. What is covered
is the part that does not depend on delivery: carrying the typed email from
login into the recovery request, and the missing-token branch of
`/reset-password`. A product that connects the notification outbox to a
provider extends `auth/password-recovery.spec.ts` with the delivered-token path.

## Conventions

- Unique data per run: emails and slugs carry a `crypto.randomUUID()` suffix, so
  a shared database does not make the second run fail.
- `forbidOnly` and retries apply only in CI; traces and screenshots are kept on
  failure under `test-results/e2e`.
- Filter by tag: `bun run test:e2e --grep @auth`.

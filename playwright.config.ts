import { defineConfig, devices } from '@playwright/test'

const portOffset = Number(process.env.E2E_PORT_OFFSET ?? 0)
const webPort = Number(process.env.E2E_WEB_PORT ?? 3100 + portOffset * 2)
const apiPort = Number(process.env.E2E_API_PORT ?? 3101 + portOffset * 2)
const host = process.env.E2E_WEB_HOST ?? '127.0.0.1'
const localBaseURL = `http://${host}:${webPort}`
const apiURL = `http://${host}:${apiPort}`
const baseURL = process.env.E2E_BASE_URL ?? localBaseURL
const envFile = process.env.E2E_ENV_FILE ?? '.env'
const envFileArgument = JSON.stringify(envFile)

export default defineConfig({
  expect: {
    // The suite runs against the Vite dev server (on-demand compilation) and a
    // shared database; under full-suite load 10s cut interactions that were
    // only slow, not broken.
    timeout: 20_000,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: 'test-results/e2e',
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      dependencies: ['setup'],
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/seed-owner.json',
      },
    },
  ],
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: `bun --env-file=${envFileArgument} apps/api/src/server.ts`,
          env: {
            API_PORT: String(apiPort),
            BETTER_AUTH_TRUSTED_ORIGINS: `${localBaseURL},${apiURL}`,
            BETTER_AUTH_URL: apiURL,
            NODE_ENV: 'test',
          },
          name: 'API',
          reuseExistingServer: false,
          timeout: 120_000,
          url: `${apiURL}/health`,
        },
        {
          command: `bun --env-file=${envFileArgument} --filter @fifilo/web dev`,
          env: {
            API_PORT: String(apiPort),
            NODE_ENV: 'test',
            WEB_HOST: host,
            WEB_PORT: String(webPort),
          },
          name: 'Web',
          reuseExistingServer: false,
          timeout: 120_000,
          url: localBaseURL,
        },
      ],
})

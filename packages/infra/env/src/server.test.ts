import { describe, expect, test } from 'bun:test'

const validRuntimeEnv = {
  APP_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'test-secret-with-at-least-thirty-two-chars',
  BETTER_AUTH_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://twincam:twincam@localhost:5432/twincam',
  VITE_APP_ENV: 'development',
}

Object.assign(Bun.env, validRuntimeEnv)

const { createServerEnv } = await import('./server')

describe('server env database pool settings', () => {
  test('defaults the beta runtime pool to five connections per process', () => {
    expect(createServerEnv(validRuntimeEnv).DATABASE_POOL_MAX).toBe(5)
  })

  test('accepts an explicit beta pool ceiling inside the documented range', () => {
    expect(createServerEnv({ ...validRuntimeEnv, DATABASE_POOL_MAX: '20' }).DATABASE_POOL_MAX).toBe(
      20,
    )
  })

  test('rejects pool sizes outside the beta safety envelope', () => {
    expect(() => createServerEnv({ ...validRuntimeEnv, DATABASE_POOL_MAX: '0' })).toThrow()
    expect(() => createServerEnv({ ...validRuntimeEnv, DATABASE_POOL_MAX: '21' })).toThrow()
  })
})

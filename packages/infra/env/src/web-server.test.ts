import { describe, expect, test } from 'bun:test'

const validRuntimeEnv = {
  API_PORT: '3001',
}

const { createWebServerEnv } = await import('./web-server')

describe('web server env runtime settings', () => {
  test('defaults the API base URL and port for local execution', () => {
    expect(createWebServerEnv(validRuntimeEnv)).toEqual({
      API_BASE_URL: undefined,
      API_PORT: 3001,
    })
  })

  test('normalizes an explicit API base URL to its origin', () => {
    expect(
      createWebServerEnv({
        ...validRuntimeEnv,
        API_BASE_URL: 'http://api:3001/',
      }).API_BASE_URL,
    ).toBe('http://api:3001')
  })

  test('rejects an API base URL with a path', () => {
    expect(() =>
      createWebServerEnv({
        ...validRuntimeEnv,
        API_BASE_URL: 'http://api:3001/internal',
      }),
    ).toThrow()
  })
})

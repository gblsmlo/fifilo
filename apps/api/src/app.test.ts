import { describe, expect, test } from 'bun:test'

import { createApp } from './app'

describe('composed API', () => {
  test('serves the health contract over the whole app', async () => {
    const response = await createApp().handle(new Request('http://localhost/health'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ service: 'api', status: 'ok' })
  })

  test('maps a validation failure to the shared 400 envelope', async () => {
    const response = await createApp().handle(
      new Request('http://localhost/api/auth/sign-up', {
        body: JSON.stringify({ email: 'not-an-email' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'invalid_request', message: 'Revise os dados enviados e tente novamente.' },
    })
  })
})

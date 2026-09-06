import { afterEach, describe, expect, test } from 'bun:test'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function createFetchStub(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  return Object.assign(handler, { preconnect: () => undefined }) as typeof fetch
}

const request = {
  email: 'ana@example.com',
  name: 'Ana',
  password: 'seed-office-demo-123',
}

describe('@auth sign-up http client', () => {
  test('posts the payload to /api/auth/sign-up and returns the parsed response', async () => {
    let capturedInput: RequestInfo | URL | undefined
    let capturedInit: RequestInit | undefined
    globalThis.fetch = createFetchStub(async (input, init) => {
      capturedInput = input
      capturedInit = init
      return Response.json({
        message: 'Conta criada com sucesso. Entre para continuar.',
        user: { email: 'ana@example.com', id: 'user_1', name: 'Ana' },
      })
    })

    const { signUp } = await import('./sign-up')
    const result = await signUp(request)

    /**
     * O path é conferido pelo sufixo porque quem resolve o destino é o
     * `cookieAwareFetch`, a cada chamada: relativo no browser, absoluto no
     * servidor. O que este teste garante é a rota alcançada, não a base.
     */
    expect(String(capturedInput).endsWith('/api/auth/sign-up')).toBe(true)
    expect(capturedInit?.method).toBe('POST')
    expect(capturedInit?.credentials).toBe('include')
    expect(JSON.parse(String(capturedInit?.body))).toEqual(request)
    expect(result.user.email).toBe('ana@example.com')
    expect(result.user.id).toBe('user_1')
  })

  test('throws an AuthRequestError with the business message and status on a business error', async () => {
    globalThis.fetch = createFetchStub(async () =>
      Response.json(
        {
          error: {
            code: 'conflict',
            message: 'Ja existe uma conta com este e-mail.',
          },
        },
        { status: 409 },
      ),
    )

    const { signUp } = await import('./sign-up')

    await expect(signUp(request)).rejects.toMatchObject({
      name: 'AuthRequestError',
      message: 'Ja existe uma conta com este e-mail.',
      code: 'conflict',
      status: 409,
    })
  })

  test('throws a controlled error when the success response does not match the contract', async () => {
    globalThis.fetch = createFetchStub(async () =>
      Response.json({ unexpected: true }, { status: 201 }),
    )

    const { signUp } = await import('./sign-up')

    await expect(signUp(request)).rejects.toMatchObject({
      name: 'AuthRequestError',
      code: 'invalid_success_response',
      status: 201,
    })
  })
})

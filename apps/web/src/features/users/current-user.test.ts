import { afterEach, describe, expect, mock, test } from 'bun:test'

const startRequest = new Request('http://localhost/dashboard', {
  headers: {
    cookie: 'session=abc123',
  },
})

mock.module('@tanstack/react-start', () => ({
  getGlobalStartContext: () => ({
    request: startRequest,
  }),
}))

const { CurrentUserLoadError, CurrentUserUnauthenticatedError, fetchCurrentUser } = await import(
  './current-user'
)

const session = {
  organization: { id: 'org_1', name: 'Acme', slug: 'acme' },
  role: 'owner',
  user: { email: 'ana@example.com', id: 'user_1', image: null, name: 'Ana' },
}

describe('fetchCurrentUser', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const createFetchStub = (
    handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  ): typeof fetch => Object.assign(handler, { preconnect: () => undefined }) as typeof fetch

  test('forwards the current request cookies during the server-side bootstrap', async () => {
    let capturedInit: RequestInit | undefined

    globalThis.fetch = createFetchStub(async (_input, init) => {
      capturedInit = init
      return Response.json(session)
    })

    const current = await fetchCurrentUser()

    expect(current.user.email).toBe('ana@example.com')
    expect(current.role).toBe('owner')
    expect(current.organization?.slug).toBe('acme')
    expect(capturedInit?.credentials).toBe('include')
    expect(new Headers(capturedInit?.headers).get('cookie')).toBe('session=abc123')
    expect(new Headers(capturedInit?.headers).get('accept')).toBe('application/json')
  })

  test('reaches the API through its own base on the server, not the browser request origin', async () => {
    let capturedInput: RequestInfo | URL | undefined

    globalThis.fetch = createFetchStub(async (input) => {
      capturedInput = input
      return Response.json({ ...session, organization: null, role: null })
    })

    await fetchCurrentUser()

    expect(String(capturedInput)).toBe('http://127.0.0.1:3001/api/me')
  })

  test('identifies an absent session from a 401 response', async () => {
    globalThis.fetch = createFetchStub(async () =>
      Response.json(
        { error: { code: 'unauthenticated', message: 'Authentication required.' } },
        { status: 401 },
      ),
    )

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(CurrentUserUnauthenticatedError)
  })

  test('preserves operational failures instead of treating them as an absent session', async () => {
    globalThis.fetch = createFetchStub(async () => new Response(null, { status: 503 }))

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(CurrentUserLoadError)
    await expect(fetchCurrentUser()).rejects.not.toBeInstanceOf(CurrentUserUnauthenticatedError)
  })
})

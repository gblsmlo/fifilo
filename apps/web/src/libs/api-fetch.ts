import { getGlobalStartContext } from '@tanstack/react-start'
import { createWebServerEnv } from '@twincam/infra-env/web-server'

const resolveRequest = (request?: Request): Request | undefined => {
  if (request) {
    return request
  }

  try {
    return (getGlobalStartContext() as { request?: Request } | undefined)?.request
  } catch {
    return undefined
  }
}

const apiBaseUrl = () => {
  const { API_BASE_URL, API_PORT } = createWebServerEnv()
  return API_BASE_URL ?? `http://127.0.0.1:${API_PORT}`
}

/**
 * Resolve o caminho para a URL que o `fetch` daquele ambiente consegue buscar.
 *
 * No browser fica relativo de propósito: same-origin cai no proxy do Vite
 * (`/api` e `/health` -> API). No servidor precisa ser absoluto **sempre** —
 * `fetch` server-side não resolve caminho relativo —, inclusive quando não há
 * `request` no contexto, que era o caso que escapava e devolvia a string crua.
 *
 * No servidor a base vem de `apiBaseUrl()`, nunca de `request.url`: o `request`
 * é a requisição que o **browser** fez ao SSR, e a origem dele não é onde a API
 * escuta. O `request` serve aqui só para repassar o cookie de sessão.
 *
 * A base é lida a cada chamada, não no load do módulo: `createWebServerEnv()`
 * consulta o ambiente na hora, e resolver uma vez só congelaria `API_BASE_URL`
 * no valor que existia quando o módulo foi importado.
 */
const apiEndpoint = (path: string, request?: Request) => {
  if (/^https?:\/\//.test(path)) return path
  if (typeof window !== 'undefined') {
    return request ? new URL(path, request.url).toString() : path
  }
  return new URL(path, apiBaseUrl()).toString()
}

export const apiFetch = (path: string, init: RequestInit = {}, request?: Request) => {
  const resolvedRequest = resolveRequest(request)
  return cookieAwareFetch(path, init, resolvedRequest)
}

export const cookieAwareFetch = (
  input: RequestInfo | URL,
  init: RequestInit = {},
  request?: Request,
) => {
  const resolvedRequest = resolveRequest(request)
  const path = typeof input === 'string' ? input : String(input)
  const headers = new Headers(init.headers)
  const cookie = resolvedRequest?.headers.get('cookie')

  if (cookie && !headers.has('cookie')) {
    headers.set('cookie', cookie)
  }

  return fetch(apiEndpoint(path, resolvedRequest), {
    ...init,
    credentials: init.credentials ?? 'include',
    headers,
  })
}

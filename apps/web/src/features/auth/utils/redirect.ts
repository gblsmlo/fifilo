const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/
const DEFAULT_REDIRECT = '/dashboard'

const toRelativePath = (value: string) => {
  try {
    const url = new URL(value)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return value
  }
}

export const encodeAuthRedirect = (redirectTo: string) =>
  toRelativePath(redirectTo).replace(/^\//, '')

export const decodeAuthRedirect = (redirect?: string, fallback = DEFAULT_REDIRECT) => {
  const value = redirect?.trim() ? redirect.trim() : fallback
  const relativePath = ABSOLUTE_URL_PATTERN.test(value) ? toRelativePath(value) : value

  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`
}

export type ObservabilityContext = {
  actorId?: string
  requestId: string
  route?: string
  workspaceId?: string
}

export const createRequestId = () => crypto.randomUUID()

export const createObservabilityContext = (
  context: Partial<ObservabilityContext> = {},
): ObservabilityContext => ({
  requestId: context.requestId ?? createRequestId(),
  ...(context.actorId ? { actorId: context.actorId } : {}),
  ...(context.route ? { route: context.route } : {}),
  ...(context.workspaceId ? { workspaceId: context.workspaceId } : {}),
})

export const createHttpContext = (request: Request): ObservabilityContext => {
  const url = new URL(request.url)
  const forwardedRequestId = request.headers.get('x-request-id')

  return createObservabilityContext({
    requestId: forwardedRequestId?.trim() || undefined,
    route: `${request.method} ${url.pathname}`,
  })
}

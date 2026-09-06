export type RuntimeEnv = Readonly<Record<string, string | undefined>>

export const readRuntimeEnv = (): RuntimeEnv => {
  const runtime = globalThis as typeof globalThis & {
    Bun?: { env: RuntimeEnv }
    process?: { env: RuntimeEnv }
  }

  return runtime.Bun?.env ?? runtime.process?.env ?? {}
}

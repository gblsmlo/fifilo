import { describe, expect, test } from 'bun:test'

type PackageManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  exports?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const sourceFiles = () =>
  new Bun.Glob('**/*.{ts,tsx}').scan({
    absolute: true,
    cwd: new URL('./', import.meta.url).pathname,
  })

describe('@twincam/patterns package boundaries', () => {
  test('never imports a feature, the core, the router or the API', async () => {
    const violations: string[] = []
    const forbidden = [
      "from '@features/",
      "from '@web/",
      "from '@twincam/core",
      "from '@tanstack/",
      "from '@twincam/api",
    ]

    for await (const sourceFile of sourceFiles()) {
      if (/\.test\.tsx?$/.test(sourceFile)) continue
      const source = await Bun.file(sourceFile).text()
      for (const specifier of forbidden) {
        if (source.includes(specifier)) violations.push(`${sourceFile}: ${specifier}`)
      }
    }

    expect(violations).toEqual([])
  })

  test('imports its own modules by relative path', async () => {
    const selfImports: string[] = []

    for await (const sourceFile of sourceFiles()) {
      if (/\.test\.tsx?$/.test(sourceFile)) continue
      const source = await Bun.file(sourceFile).text()
      if (source.includes("from '@twincam/patterns")) selfImports.push(sourceFile)
    }

    expect(selfImports).toEqual([])
  })

  test('publishes every composition by explicit subpath and shares runtimes as peers', async () => {
    const manifest = (await Bun.file(
      new URL('../package.json', import.meta.url),
    ).json()) as PackageManifest

    expect(manifest.exports?.['.']).toBeUndefined()
    expect(Object.keys(manifest.exports ?? {}).every((key) => key.startsWith('./'))).toBe(true)
    expect(manifest.peerDependencies).toEqual({
      '@base-ui/react': 'catalog:',
      react: 'catalog:',
    })
    expect(manifest.dependencies?.['@twincam/ui']).toBe('workspace:*')
  })
})

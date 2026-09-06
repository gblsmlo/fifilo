import { describe, expect, test } from 'bun:test'

type PackageManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  exports?: Record<string, string | null>
  peerDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

describe('@fifilo/ui package boundaries', () => {
  test('uses relative imports inside the package source', async () => {
    const selfImports: string[] = []
    const sourceFiles = new Bun.Glob('**/*.{ts,tsx}').scan({
      absolute: true,
      cwd: new URL('./', import.meta.url).pathname,
    })

    for await (const sourceFile of sourceFiles) {
      if (/\.test\.tsx?$/.test(sourceFile)) continue
      const source = await Bun.file(sourceFile).text()
      if (source.includes("from '@fifilo/ui")) selfImports.push(sourceFile)
    }

    expect(selfImports).toEqual([])
  })

  test('publishes components by subpath and never through a root barrel', async () => {
    const manifest = (await Bun.file(
      new URL('../package.json', import.meta.url),
    ).json()) as PackageManifest

    expect(manifest.exports?.['.']).toBeUndefined()
    expect(manifest.exports?.['./components/*.test']).toBeNull()
    expect(manifest.exports?.['./components/*']).toBe('./src/components/*.tsx')
  })

  test('classifies shared runtimes, implementation dependencies and tooling explicitly', async () => {
    const manifest = (await Bun.file(
      new URL('../package.json', import.meta.url),
    ).json()) as PackageManifest

    // The invariant is the classification, not the version: versions belong to
    // the root `workspaces.catalog`, and a literal here would be a second source.
    expect(manifest.peerDependencies).toEqual({
      '@base-ui/react': 'catalog:',
      react: 'catalog:',
    })
    expect(manifest.devDependencies).toMatchObject({
      '@base-ui/react': 'catalog:',
      react: 'catalog:',
    })
    expect(manifest.scripts?.test).toContain('--isolate')

    for (const dependency of ['@fontsource-variable/inter', 'geist', 'tw-animate-css']) {
      expect(manifest.dependencies?.[dependency]).toBeUndefined()
      expect(manifest.devDependencies?.[dependency]).toBeUndefined()
    }
  })
})

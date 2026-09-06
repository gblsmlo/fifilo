import { describe, expect, test } from 'bun:test'

type PackageManifest = {
  dependencies?: Record<string, string>
}

const importedPackageRoot = (specifier: string) => {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/')
  }

  return specifier.split('/')[0] ?? specifier
}

const collectDirectImports = async () => {
  const imports = new Set<string>()
  const importPattern = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g
  const glob = new Bun.Glob('**/*.{ts,tsx}')

  for await (const relativePath of glob.scan({ cwd: import.meta.dir })) {
    const source = await Bun.file(`${import.meta.dir}/${relativePath}`).text()

    for (const match of source.matchAll(importPattern)) {
      const specifier = match[2]

      if (
        specifier &&
        !specifier.startsWith('.') &&
        !specifier.startsWith('bun:') &&
        !specifier.startsWith('node:')
      ) {
        imports.add(importedPackageRoot(specifier))
      }
    }
  }

  return imports
}

describe('@twincam/api dependency contract', () => {
  test('declares every package its source imports directly', async () => {
    const manifest = (await Bun.file(
      `${import.meta.dir}/../package.json`,
    ).json()) as PackageManifest
    const declared = new Set(Object.keys(manifest.dependencies ?? {}))
    const undeclared = [...(await collectDirectImports())].filter((name) => !declared.has(name))

    expect(undeclared).toEqual([])
  })
})

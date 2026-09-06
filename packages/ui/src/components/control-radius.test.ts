import { describe, expect, test } from 'bun:test'

const workspaceRoot = new URL('../../../../', import.meta.url)

describe('control-radius', () => {
  test('is a Tailwind utility backed by the shared control radius token', async () => {
    const globalCss = await Bun.file(
      new URL('apps/web/src/styles/global.css', workspaceRoot),
    ).text()

    expect(globalCss).toContain('--radius-control:')
    expect(globalCss).toContain('@utility control-radius')
    expect(globalCss).toContain('border-radius: var(--radius-control);')
  })

  test.each([
    'button.tsx',
    'input.tsx',
    'select.tsx',
  ])('is applied explicitly by %s', async (componentFile) => {
    const source = await Bun.file(new URL(componentFile, import.meta.url)).text()

    expect(source).toContain('control-radius')
  })
})

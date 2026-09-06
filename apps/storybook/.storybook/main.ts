import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig } from 'vite'

const storyFiles = '**/*.stories.@(js|jsx|mjs|ts|tsx)'

// Every consumer of `@libs/api-fetch` gets the browser stub: the real module
// reads the SSR request through `@tanstack/react-start`, which has no place in
// a story. The specific alias must come before the `@libs` prefix.
export const storybookAliases = [
  {
    find: '@libs/api-fetch',
    replacement: fileURLToPath(new URL('../src/api-fetch.ts', import.meta.url)),
  },
  { find: '@libs', replacement: fileURLToPath(new URL('../../web/src/libs', import.meta.url)) },
  {
    find: '@features',
    replacement: fileURLToPath(new URL('../../web/src/features', import.meta.url)),
  },
  { find: '@web', replacement: fileURLToPath(new URL('../../web/src', import.meta.url)) },
]

const config: StorybookConfig = {
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-vitest'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  // The Atomic ladder orders the catalog; `titlePrefix` per directory names
  // the group, and `storySort` in preview.ts decides the visual order.
  stories: [
    { directory: '../src/stories/ui', files: storyFiles, titlePrefix: 'UI' },
    { directory: '../src/stories/patterns', files: storyFiles, titlePrefix: 'Patterns' },
    { directory: '../src/stories/features', files: storyFiles, titlePrefix: 'Features' },
    { directory: '../src/stories/layouts', files: storyFiles, titlePrefix: 'Layout' },
    { directory: '../src/stories/pages', files: storyFiles, titlePrefix: 'Pages' },
  ],
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      resolve: { alias: storybookAliases },
    }),
}

export default config

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}

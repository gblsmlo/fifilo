import type { Preview } from '@storybook/react-vite'
import { type ReactNode, createElement, useEffect } from 'react'
import { MINIMAL_VIEWPORTS } from 'storybook/viewport'
import { A11Y_BASELINE_RULES } from '../src/test-utils/a11y'

import '../../web/src/styles/global.css'

type ThemeName = 'light' | 'dark'

const viewports = {
  mobile: { name: 'Mobile', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
  desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
  wide: { name: 'Wide desktop', styles: { width: '1920px', height: '1080px' }, type: 'desktop' },
}

const isThemeName = (value: unknown): value is ThemeName => value === 'light' || value === 'dark'

const StoryTheme = ({ children, theme }: { children?: ReactNode; theme: ThemeName }) => {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return createElement('div', { className: 'bg-background text-foreground' }, children)
}

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const theme = isThemeName(context.globals.theme) ? context.globals.theme : 'dark'

      return createElement(StoryTheme, { theme }, createElement(Story))
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Preview theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'app-dark' },
    theme: 'dark',
    viewport: { value: 'desktop', isRotated: false },
  },
  parameters: {
    a11y: {
      test: 'todo',
      config: {
        rules: A11Y_BASELINE_RULES,
      },
    },
    backgrounds: {
      options: {
        'app-dark': { name: 'App dark', value: 'var(--background)' },
        'app-light': { name: 'App light', value: 'var(--background)' },
      },
    },
    layout: 'centered',
    options: {
      storySort: {
        // The Atomic ladder orders the groups. Inside `Pages` the order is the
        // access journey, not the alphabetical one Storybook would apply.
        order: [
          'UI',
          'Patterns',
          'Features',
          'Layout',
          'Pages',
          ['Login', 'Register', 'ForgottenPassword', 'ResetPassword', 'TwoFactor'],
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: {
        ...MINIMAL_VIEWPORTS,
        ...viewports,
      },
    },
  },
}

export default preview

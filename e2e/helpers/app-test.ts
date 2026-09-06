import type { Page } from '@playwright/test'
import { test as base } from '@playwright/test'

const HYDRATION_TIMEOUT = 15_000

/**
 * The app is server-rendered: the HTML arrives complete but only responds to
 * interaction after hydration. A click inside that window is lost silently: the
 * element passes every Playwright actionability check and nothing happens.
 *
 * TanStack Start exposes no hydration state on `window`, and `networkidle`
 * never settles with the Vite websocket. The available signal is React: it
 * attaches `__reactProps$` to nodes as it hydrates. Waiting for that marker
 * after every navigation lets tests interact directly, without defensive retries.
 */
export const waitForHydration = (page: Page) => {
  return page.waitForFunction(
    () => {
      const hydrated = (element: Element) =>
        Object.keys(element).some((key) => key.startsWith('__reactProps$'))
      // Buttons **and** links: not every screen has a button. `/reset-password`
      // without a token swaps the form for an explanation and a link.
      const controls = Array.from(document.querySelectorAll('button, a[href]'))
      if (controls.length > 0) {
        // `every`, not `some`: the sidebar hydrates before the content, and one
        // ready control does not mean the test target responds.
        return controls.every(hydrated)
      }
      const root = document.querySelector('main, section')
      return root !== null && hydrated(root)
    },
    undefined,
    { timeout: HYDRATION_TIMEOUT },
  )
}

/**
 * Applies the same hydration wait to a page that did not come from this suite's
 * `page` fixture, such as a second `BrowserContext` created by hand.
 */
export const wrapPageWithHydrationWait = (page: Page): Page => {
  const navigate = page.goto.bind(page)

  page.goto = async (url, options) => {
    const response = await navigate(url, options)
    await waitForHydration(page)
    return response
  }

  return page
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(wrapPageWithHydrationWait(page))
  },
})

export { expect } from '@playwright/test'

import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
})

const { window } = dom
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Text: window.Text,
  Comment: window.Comment,
  CustomEvent: window.CustomEvent,
  Event: window.Event,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame:
    window.requestAnimationFrame?.bind(window) ??
    ((callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 16)),
  cancelAnimationFrame:
    window.cancelAnimationFrame?.bind(window) ?? ((handle: number) => window.clearTimeout(handle)),
  MutationObserver: window.MutationObserver,
})

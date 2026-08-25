import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { resetDataLayer } from '@/data/clients'

// Every test starts from a clean data layer: no leaked fixtures, no injected
// failure, no carried-over latency setting. See src/data/clients/index.ts.
beforeEach(() => {
  resetDataLayer()
})

/**
 * jsdom implements neither `ResizeObserver` nor `matchMedia`, and Radix needs
 * both: `scroll-area` observes its viewport, and several primitives feature-test
 * a media query. Without these, any component test that renders the sub-tab
 * column, a popover with a scroll area, or the notification centre throws
 * `ResizeObserver is not defined` from inside `node_modules` — a failure that
 * says nothing about the component under test.
 *
 * Added in 0.7 alongside the first component tests. Deliberately minimal: these
 * are stubs that let layout effects run, **not** simulations. A test that needs
 * a real measurement is a test that belongs in Playwright.
 */
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub
}

if (!('matchMedia' in globalThis)) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  })
}

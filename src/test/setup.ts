import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/dom'
import { beforeEach } from 'vitest'
import { resetDataLayer } from '@/data/clients'
import { resetRequestCache } from '@/hooks/requestCache'

/**
 * **`findBy*` waits 5 s, not testing-library's default 1 s.**
 *
 * The slowest assertions in this suite cross two async hops on purpose: typing
 * into a table's search field starts a debounce (`DEFAULT_DEBOUNCE_MS`), and only
 * when that fires does `useIndexTable` re-query and `useAsync` resolve. One
 * second is comfortable for that in isolation and marginal when a dozen jsdom
 * workers share a machine.
 *
 * Diagnosed rather than assumed, because the symptom reads exactly like a logic
 * bug: the affected tests pass individually, pass under
 * `--no-file-parallelism`, and **the failing set changes between identical
 * full-suite runs** — which no logic defect does. Two independent measurements
 * agreed before this number moved. Raising `testTimeout` alone did nothing,
 * which is what identified `findBy`'s own budget as the actual limit.
 *
 * This is a wait budget, not a licence for slow tests: it bounds how long a
 * *correct* assertion may take to become true, and a genuinely absent element
 * still fails, five seconds later.
 */
configure({ asyncUtilTimeout: 5_000 })

// Every test starts from a clean data layer: no leaked fixtures, no injected
// failure, no carried-over latency setting. See src/data/clients/index.ts.
//
// And a clean `useAsync` cache (P1-T3). It is module-level and keyed by operation
// id, so without this a warm entry from one test file's render would serve the
// next one's first mount — content where the test expected a skeleton, in a file
// that never mentions caching.
beforeEach(() => {
  resetDataLayer()
  resetRequestCache()
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

/**
 * jsdom implements no scrolling at all, so `Element.prototype.scrollIntoView`
 * is undefined — and `cmdk` calls it from a layout effect every time the active
 * row changes, which is on **every keystroke** in a list that has rows.
 *
 * Before the command centre landed, the global-search popover rendered rows
 * only after a query resolved, so a handful of tests reached that path and the
 * rest never did. The palette is **populated before a key is pressed**
 * (P3-T8), so every test that opens the shell now renders rows on the first
 * paint, and the missing method surfaces as `i.scrollIntoView is not a
 * function` thrown from inside `node_modules` — a failure that says nothing
 * about the component under test.
 *
 * Same class as the two stubs above, and the same rule: this lets the layout
 * effect run, it does not simulate scrolling. A test that needs to assert what
 * is actually in view belongs in Playwright.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {}
}

/**
 * jsdom implements no pointer capture either, and Sonner calls
 * `setPointerCapture` on `pointerdown` to drive its swipe-to-dismiss gesture.
 *
 * It never fired before, because no test had ever pressed a control **inside** a
 * toast — every toast in the suite was read and left to expire. D18 puts `Undo`
 * on the outcome toast, so pressing one is now a first-class assertion, and the
 * missing method surfaces as an **uncaught exception** rather than a test
 * failure: it escapes React's event dispatch and fails the file that happened
 * to be running.
 *
 * Same class as the three stubs above, same rule: it lets the handler run, it
 * does not simulate a gesture.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.setPointerCapture !== 'function') {
  Element.prototype.setPointerCapture = function setPointerCapture(): void {}
  Element.prototype.releasePointerCapture = function releasePointerCapture(): void {}
  Element.prototype.hasPointerCapture = function hasPointerCapture(): boolean {
    return false
  }
}

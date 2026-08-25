/**
 * **The** breakpoint. D2, resolved in 0.2: `--ev-bp-wide: 1344px`.
 *
 * One number, one media query, three uses — the sub-tab list's first-run default
 * (§3.3), the detail right-rail drop (§7.2) and the metric-tile grid. D2 is
 * explicit that **nobody adds a second breakpoint**, so this module reads the
 * value from CSS rather than declaring it: `src/styles/globals.css` owns
 * `--ev-bp-wide`, and JS asks.
 *
 * The fallback below is not a second source of truth — it is what to do when
 * there is no stylesheet yet (jsdom, a unit test, the first paint of a
 * server-rendered document). If it ever disagrees with `globals.css`, the CSS is
 * right and this constant is stale.
 */

/** Matches `--ev-bp-wide` in `src/styles/globals.css`. See DECISIONS.md D2. */
export const WIDE_BREAKPOINT_FALLBACK_PX = 1344

/**
 * `--ev-bp-wide` in CSS pixels, read from the document element's computed style.
 * Returns the fallback when the custom property is absent or unparseable.
 */
export function readWideBreakpointPx(doc: Document | null = globalThis.document ?? null): number {
  if (!doc?.documentElement) return WIDE_BREAKPOINT_FALLBACK_PX
  const raw = getComputedStyle(doc.documentElement).getPropertyValue('--ev-bp-wide').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : WIDE_BREAKPOINT_FALLBACK_PX
}

/**
 * Whether the viewport is on the wide side of the one breakpoint, **right now**.
 *
 * Read once, at first run. §3.9 forbids re-deriving nav state from a resize by
 * name, so there is no listener here and no hook wrapping this — `useNavCollapse`
 * calls it exactly once, in a lazy `useState` initialiser.
 *
 * `innerWidth`, not `matchMedia`: nothing subscribes, so a `MediaQueryList` would
 * only add a jsdom shim requirement for a value we read once.
 */
export function isWideViewport(win: Window | null = globalThis.window ?? null): boolean {
  if (!win) return true
  return win.innerWidth >= readWideBreakpointPx(win.document)
}

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
 * name, so there is no listener here and no hook wrapping this: a caller reads it
 * once, in a lazy `useState` initialiser, and never again.
 *
 * `useNavCollapse` was that caller until 02-shell-fixes deleted it (**D5**).
 * `--ev-bp-wide` still has two of its three documented uses ahead of it — the
 * detail right-rail drop (§7.2) and the metric-tile grid — so this stays; it is
 * not yet dead, only not yet called.
 *
 * `innerWidth`, not `matchMedia`: nothing subscribes, so a `MediaQueryList` would
 * only add a jsdom shim requirement for a value we read once.
 */
export function isWideViewport(win: Window | null = globalThis.window ?? null): boolean {
  if (!win) return true
  return win.innerWidth >= readWideBreakpointPx(win.document)
}

/* ══════════════════════════════════════════════════════════════════════════
   THE COMPACT BREAKPOINT — added 2026-09-02 under the owner's viewport ruling.

   The header above says "nobody adds a second breakpoint", and until this date
   that was the whole law: `index.html` declared `width=1280`, so a phone was
   handed a 1280px layout viewport scaled to 0.305x and no max-width query could
   ever match. The tag is now `width=device-width`, the ruling is recorded in
   `index.html`, and `globals.css` §0.1 is amended under it.

   `globals.css` owns both halves and they are declared beside each other so
   they cannot drift:

     @custom-variant compact (@media (width < 768px));
     --ev-bp-compact: 768px;

   This module is the JS half of the second line. It is deliberately the SAME
   SHAPE as the wide breakpoint above — read from CSS, fallback documented as
   stale-not-authoritative — so there is one way to ask "which side of a
   breakpoint am I on" in this product rather than two.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Matches `--ev-bp-compact` in `src/styles/globals.css`.
 *
 * As with `WIDE_BREAKPOINT_FALLBACK_PX`, this is not a second source of truth.
 * It is what to answer when there is no stylesheet yet — jsdom, a unit test,
 * the first paint. If it disagrees with `globals.css`, the CSS is right.
 */
export const COMPACT_BREAKPOINT_FALLBACK_PX = 768

/**
 * `--ev-bp-compact` in CSS pixels, read from the document element's computed
 * style. Returns the fallback when the custom property is absent or
 * unparseable.
 */
export function readCompactBreakpointPx(doc: Document | null = globalThis.document ?? null): number {
  if (!doc?.documentElement) return COMPACT_BREAKPOINT_FALLBACK_PX
  const raw = getComputedStyle(doc.documentElement).getPropertyValue('--ev-bp-compact').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : COMPACT_BREAKPOINT_FALLBACK_PX
}

/**
 * The media query the compact shell subscribes to.
 *
 * **`width < N`, character for character the `compact:` variant's own query**,
 * and not the `max-width: N-1` form. Range syntax is exclusive, so the two
 * agree at every fractional width — a 767.5px viewport (a zoomed browser, a
 * split-screen tablet) matches both. `max-width: 767px` would match the CSS
 * variant and not this query on that exact viewport, and the symptom of that
 * disagreement is the worst one available: the CSS hides the rail while the JS
 * still thinks it is desktop, so nothing renders the control that brings it
 * back. Range syntax is supported wherever `env()` and `dvh` are, which this
 * shell already depends on.
 */
export function compactMediaQuery(doc: Document | null = globalThis.document ?? null): string {
  return `(width < ${readCompactBreakpointPx(doc)}px)`
}

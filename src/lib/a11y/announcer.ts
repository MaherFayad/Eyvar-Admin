/**
 * The one live region. **AC-29** — *"Exactly one live region exists in the
 * document, and the result of an asynchronous mutation is announced through it."*
 *
 * Baseline for how far this is from where the product starts: `aria-` appears
 * **zero times** in `eyvar_ops_panel_v40_fixed.html`, across 357 `toast()` call
 * sites (`:5254`).
 *
 * Deliberately imperative and singleton rather than a component:
 * - AC-29 says *exactly one*. A `<LiveRegion />` that any screen can render is
 *   one `git grep` away from being three.
 * - It has to be reachable from `useAsync`, from a row action's error handler and
 *   from the save bar, none of which own JSX at the point they need to speak.
 *
 * There is one region and it is `polite`. An assertive announcement is a
 * different thing — a critical banner carrying `role="alert"` — and belongs to
 * the component that renders the condition, not to this queue. Adding an
 * `assertive` region here would make AC-29 read "exactly two".
 *
 * Never the only carrier of information (§7.5): announcing is what a screen does
 * **in addition to** rendering the state, not instead of it.
 */

const REGION_ID = 'ev-live-region'

/**
 * Screen readers announce a *mutation* of the region, so writing the same string
 * twice in a row is silent. Clearing first, then writing on the next task, is the
 * standard fix and the reason `announce` is not synchronous.
 */
const ANNOUNCE_DELAY_MS = 0

let pending: ReturnType<typeof setTimeout> | null = null

/** Creates the region on first use and returns the same element forever after. */
export function getLiveRegion(doc: Document = document): HTMLElement {
  const existing = doc.getElementById(REGION_ID)
  if (existing) return existing

  const region = doc.createElement('div')
  region.id = REGION_ID
  region.setAttribute('role', 'status')
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'true')
  // Visually hidden, not `display:none` — a hidden region is never announced.
  // Inline because this element is created before any stylesheet is guaranteed,
  // and because it renders nothing an operator can see. No token applies.
  region.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;' +
    'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0'
  doc.body.appendChild(region)
  return region
}

/**
 * Announce the outcome of an asynchronous mutation.
 *
 * The message is a **finished, translated string** — `t('table.rowsPaused', {…})`,
 * never a key and never a concatenation (AC-74, AC-75).
 */
export function announce(message: string, doc: Document = document): void {
  const region = getLiveRegion(doc)
  if (pending !== null) clearTimeout(pending)
  region.textContent = ''
  pending = setTimeout(() => {
    pending = null
    region.textContent = message
  }, ANNOUNCE_DELAY_MS)
}

/** What the region currently says. For assertions; not for application code. */
export function currentAnnouncement(doc: Document = document): string {
  return doc.getElementById(REGION_ID)?.textContent ?? ''
}

/** Test seam: drop the region and any queued announcement. */
export function resetAnnouncer(doc: Document = document): void {
  if (pending !== null) {
    clearTimeout(pending)
    pending = null
  }
  doc.getElementById(REGION_ID)?.remove()
}

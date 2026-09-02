/**
 * **`ui.density`, wired.** D16 class 2, `data/clients/preferences.ts:68`.
 *
 * `UiDensity = 'comfortable' | 'compact'` was declared, validated, versioned,
 * cached per operator, round-tripped through `GET/PUT /me/ui-state` and
 * asserted by two test files — and read by **nothing**. Two independent audits
 * found it separately, which is what a fully-built preference with no consumer
 * looks like from the outside: it is indistinguishable from a working one until
 * somebody toggles it.
 *
 * ## What compact actually is, and it is not what the docs assumed
 *
 * Docs `13` and `15` both sized this work against a 40px row, because
 * `--ev-row-h` is 40px. **A row is not 40px and never was.** `h-row` is a
 * `height` on the cell, which under `table-layout: fixed` acts as a floor: the
 * row is as tall as its content plus the cell's block padding, and it clears
 * that floor before it ever binds.
 *
 * So compact cannot "restore the 40px row" — there is no 40px row to restore.
 * What it can take is **the block padding**, which is the only part of a row
 * that is not content: `TableCell` declares `py-2`, 8px above and 8px below,
 * and compact halves it to `py-1`. The floor comes off with it, because a 40px
 * floor under a 41px row is inert, and leaving it would make compact do
 * nothing on exactly the single-line tables it helps most.
 *
 * **Measured in Chromium, both densities, both viewports** (row pitch in px —
 * the delta between two rows' box tops, so it includes the hairline):
 *
 * | | comfortable | compact |
 * |---|---:|---:|
 * | Corporate — two-line identity | 53 | **45** |
 * | Trips — two-line identity | 53 | **45** |
 * | Rider wallets | 53 | **45** |
 * | People — declared media | 60 | **45** |
 * | Payouts — two labelled actions | 77 | **69** |
 * | Support queue | 77 | **69** |
 * | Email log | 77 | **69** |
 *
 * So compact is **a constant 8px a row** — the block padding, and nothing
 * else — except on the media views, where it is 15 because it also takes the
 * declared 60px floor. Rows visible at 1512x900 go 10 → 12 on Corporate and
 * Trips and 9 → 12 on People; at 1280x800, 8 → 10 and 7 → 10.
 *
 * The three tables at 77 were at 109, 93 and 141 before `rowActions.tsx`
 * bounded the refusal sentence; that was a taller defect than density is a win,
 * and it is recorded there with its own measurement.
 *
 * ## Why a module store rather than a prop or a context
 *
 * A prop means twenty-two screens forward a preference none of them owns, and
 * the twenty-third forgets. A context means a provider in the shell, and the
 * shell is another agent's file this week.
 *
 * `useSyncExternalStore` over the same `defaultUiStore` entry the rest of D16
 * uses gives every mounted table one subscription to one value: the popover
 * writes, every table on screen re-renders, and the write goes through the
 * cache that `preferences.ts` fans the server's bag out into — so a reload
 * paints the operator's density on the first frame rather than after the
 * `/me/ui-state` round trip.
 *
 * **No token is minted here.** `py-1` and `py-2` are the spacing scale;
 * `h-row` / `h-row-media` are `--ev-row-h` / `--ev-row-h-media`. A
 * `--ev-row-h-compact` would be the honest declaration of the compact floor,
 * and `globals.css` belongs to another agent — recorded in the handoff, not
 * smuggled in as an arbitrary value.
 */

import { useSyncExternalStore } from 'react'
import { isUiDensity, type UiDensity } from '@/data/clients/preferences'
import { UI_STATE_KEYS, currentUiStateOwner, defaultUiStore } from '@/lib/persistence'

export type { UiDensity }

/** `preferences.ts`'s own default, and the value every unset operator gets. */
const DEFAULT_DENSITY: UiDensity = 'comfortable'

const listeners = new Set<() => void>()

function store() {
  return defaultUiStore<UiDensity>(UI_STATE_KEYS.density, isUiDensity)
}

/**
 * **Cached, because `useSyncExternalStore` calls its snapshot on every render**
 * — twice on some, to check for tearing — and the store's read is a
 * `localStorage.getItem` plus a `JSON.parse`. Every mounted table would pay
 * that on every render of a forty-screen product.
 *
 * **Keyed on the operator, because a cache that is not is the shift-change
 * leak D16 rejects `localStorage`-as-the-store for.** `setUiStateOwner` drops
 * the store tier on a sign-in; a module-level value that ignored it would paint
 * the previous operator's density for the next one. `currentUiStateOwner` is a
 * variable read, so the guard costs nothing per render.
 *
 * The only writer inside this tab is `setTableDensity`. Another tab writing the
 * same key does not reach this cache, which is the same staleness every other
 * `defaultUiStore` consumer already carries — D16: the cache is a paint
 * accelerator, the server is the truth.
 */
let cached: UiDensity | null = null
let cachedOwner: string | null | undefined

export function readTableDensity(): UiDensity {
  const owner = currentUiStateOwner()
  if (cached === null || cachedOwner !== owner) {
    cachedOwner = owner
    cached = store().read() ?? DEFAULT_DENSITY
  }
  return cached
}

/**
 * Write it, and tell every mounted table.
 *
 * The store is the cache tier D16 describes as *"a paint accelerator and never
 * the source of truth"*: the server still wins on the next `/me/ui-state`
 * response, which is why this writes the cache and does not invent a second
 * `PUT`. Persisting it to the server is `updateUiState({ density })` at
 * whichever surface owns the operator's settings, and that surface does not
 * exist yet — noted in the handoff rather than half-built here.
 */
export function setTableDensity(density: UiDensity): void {
  cached = density
  cachedOwner = currentUiStateOwner()
  store().write(density)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTableDensity(): UiDensity {
  return useSyncExternalStore(subscribe, readTableDensity, () => DEFAULT_DENSITY)
}

/**
 * The two class fragments a density is, and there are only two.
 *
 * `row` lands on the `<tr>` and `cell` on every `<td>`; `cn`'s merge resolves
 * the `h-` and `py-` conflicts against `TableCell`'s own defaults, so compact is
 * an override of the primitive rather than a second primitive.
 *
 * **`h-auto` on both, and it has to be on both.** The floor is declared twice —
 * `DataTable` puts it on the row and `ui/table.tsx`'s `TableCell` puts `h-row`
 * on every cell — so overriding one of the two leaves a 40px floor that the 8px
 * saving can never get under, and compact would measure identically to
 * comfortable on exactly the single-line tables it helps most. It is also what
 * makes compact reach the media views, whose 60px is a declared floor rather
 * than content.
 */
export function densityClasses(
  density: UiDensity,
  media: boolean,
): { row: string; cell: string } {
  if (density === 'compact') return { row: 'h-auto', cell: 'h-auto py-1' }
  return { row: media ? 'h-row-media' : 'h-row', cell: '' }
}

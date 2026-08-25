/**
 * The instant this screen measures "12m left" and "24d" against.
 *
 * **The fixed clock is not a test detail — it is what the mock IS.** Every
 * fixture is written against `EYVAR_NOW` (`2026-06-25T09:14:00+03:00`), which
 * is the legacy app's own `REQ_NOW_REF` (`:9555`). Reading the host clock in
 * mock mode would render every SLA as decades overdue and every document as
 * long expired, and a visual regression taken at 23:59 would fail at 00:01.
 *
 * In `http` mode the host clock is the right answer, so this returns the live
 * one — through `useTick`'s **single** shared interval (spec §4.4, "one
 * clock"), never a per-page `setInterval`. In mock mode the subscription is
 * not even opened: `useNow`'s `enabled` argument is `false`, so the screen
 * costs the heartbeat nothing.
 */

import { DATA_SOURCE, EYVAR_NOW } from '@/data/clients'
import type { IsoDateTime } from '@/data/types'
import { useNow } from '@/hooks'

export function useNowIso(): IsoDateTime {
  const live = useNow(60, DATA_SOURCE !== 'mock')
  return DATA_SOURCE === 'mock' ? EYVAR_NOW : live
}

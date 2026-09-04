/**
 * The rider sheet's body: a rail of standing facts ABOVE a column of history,
 * and the four reads that feed both.
 *
 * ```
 *  ┌──────────────────────────────────────┐
 *  │ WALLET                               │
 *  │ UNDER REVIEW                         │   the rail, --color-muted
 *  │ PLAN                                 │   full width, blocks stacked
 *  │ TRIPS                                │
 *  │ CHURN RISK                           │
 *  ├──────────────────────────────────────┤
 *  │  Activity 4 │ Money 4 │ Identity     │
 *  │  ─────────────────────────────────   │   the panels, --color-card
 *  │  ● Open right now                    │
 *  │  EARLIER …                           │
 *  └──────────────────────────────────────┘
 *            --ev-drawer-w, 480
 * ```
 *
 * One column, unconditionally — see the note on `RiderProfile` below for the
 * measurement that decided it against widening the drawer.
 *
 * ## The four reads, and why each is one read
 *
 * | read | what it answers | why not several |
 * |---|---|---|
 * | `getRider` (owned by `ProfileLayer`) | the band, the whole money block, engagement, identity, churn level **and** reason | three figures on one line must not have three loading states |
 * | `getRiderTimeline` | the Activity rows | server-derived across the account, its plans and its trips: two surfaces merging three resources each is the two-answers defect, and same-day ordering must have exactly one answer |
 * | `getRiderMoneyMovements` | the Money rows, and which of them are inside the balance | an operator asking *"where did the money go"* does not know a fare is a card capture that never touched the wallet |
 * | `getRiderSupportPresence` | what else in the console references this rider | six clients, six loading states and six error states to render one paragraph is the defect `record.ts` already argues against for the record itself |
 *
 * The one collection read left is the plan cycle, because the rail states its
 * **status, its plan name, its window and its legs** and the timeline carries
 * only the two halves of that as separate events.
 *
 * ## Why the reads are here and not inside the blocks that render them
 *
 * The tab BADGES are counts of the same collections the PANELS list, and the
 * badges sit on the tab row above the panels. A read owned by the panel could
 * not reach the badge, and a second read to feed the badge would be two
 * requests racing for one number — the defect `record.ts` records against its
 * own earlier shape (*"two reads of one record, racing, for one badge"*).
 *
 * Rules applied
 *   §11.3      the loading state is `RiderSkeleton` — the same two columns, the
 *              same rail blocks, the same tab row. Never a spinner.
 *   §9.2 #14   each read owns its own four states inside the panel that renders
 *              it, so one failed collection does not take the sheet down.
 *   §9.1       nothing here is placed on a physical side. The one column is a
 *              `flex-col`, which has no direction to mirror, and the rail's
 *              separating rule is a `border-b` on the block axis for the same
 *              reason — it was a `border-e` while the rail was a column beside
 *              the panels, and an inline edge is the thing that would have had
 *              to mirror.
 */

import {
  getRiderMoneyMovements,
  getRiderSupportPresence,
  getRiderTimeline,
  listSubscriptions,
} from '@/data/clients'
import type {
  Paginated,
  Rider,
  RiderMoneyMovements,
  RiderSupportPresence,
  RiderTimelineEvent,
  Subscription,
} from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import { MINI_LEDGER_ROWS } from '../fields'
import type { Language, Translate } from '@/lib'
import { RiderPanels, type RiderReads } from './RiderPanels'
import { RiderRail } from './RiderRail'

export interface RiderProfileProps {
  rider: Rider
  reads: RiderProfileReads
  t: Translate
  language: Language
}

/** Everything the sheet reads for itself. The RECORD is `ProfileLayer`'s. */
export interface RiderProfileReads extends RiderReads {
  subscriptions: AsyncResult<Paginated<Subscription>>
}

/**
 * `enabled` is the caller saying *this record is a rider*. It is a parameter and
 * not a `riderId === ''` sentinel because a hook cannot be called conditionally:
 * `ProfileLayer` calls this for all eleven record kinds and must fire the reads
 * for exactly one of them. An empty id under a disabled read is never used as a
 * key — `useAsync` stores nothing while `enabled` is false.
 */
export function useRiderReads(riderId: string, enabled = true): RiderProfileReads {
  const timeline = useAsync<Paginated<RiderTimelineEvent>>(
    (signal) => getRiderTimeline(riderId, { pageSize: MINI_LEDGER_ROWS }, signal),
    { deps: [riderId], enabled, cacheKey: 'riders.timeline' },
  )

  const money = useAsync<RiderMoneyMovements>(
    (signal) => getRiderMoneyMovements(riderId, signal),
    {
      deps: [riderId],
      enabled,
      cacheKey: 'riders.movements',
      /* A rider with no movements is a real, renderable answer — the tab prints
         its own sentence — and the default `Paginated`-shaped guess does not
         apply to this envelope. The panel decides emptiness from the list. */
      isEmpty: () => false,
    },
  )

  const support = useAsync<RiderSupportPresence>(
    (signal) => getRiderSupportPresence(riderId, signal),
    {
      deps: [riderId],
      enabled,
      cacheKey: 'riders.support',
      /* Seven counts, all of which may legitimately be zero. `{0,0}` on every
         resource is an ANSWER — *"nothing anywhere references this rider"* — and
         the panel prints it per resource. It is not an empty read. */
      isEmpty: () => false,
    },
  )

  const subscriptions = useAsync<Paginated<Subscription>>(
    (signal) =>
      listSubscriptions({ riderId, pageSize: 1, sort: { field: 'endsOn', dir: 'desc' } }, signal),
    { deps: [riderId], enabled, cacheKey: 'subscriptions.list' },
  )

  return { timeline, money, support, subscriptions }
}

/**
 * **ONE COLUMN — the rail above the tabs — and the measurement that decided it.**
 *
 * This body was laid out for the modal presentation, which was ~1232px across
 * at the 1280 floor. The layer is a `drawer` again (`ProfileLayer`), so the
 * body is `--ev-drawer-w` = **480px**, and the two-column arrangement does not
 * survive that. Measured in Chromium at 1280 × 900 on `RDR-4002`, panel forced
 * to each width, `scrollWidth > clientWidth` counted on every descendant:
 *
 * | panel | rail box | rail needs | overflowing elements |
 * |---|---|---|---|
 * | **480** | 159 | **170** | the rail, its ground, its first block, and the wallet figure (`200.00 SAR` wants **154** in a **126** box) |
 * | 560 | 186 | 186 | one truncated caption (200 → 185) |
 * | **640** | 213 | 213 | **none** |
 * | 800 | 266 | 266 | none |
 *
 * So at the drawer's own width the two columns do not compress — the rail
 * **overflows its own box by 11px and the wallet figure by 28px**, spilling
 * across the divider into the tab column. Two columns first become clean at
 * **640px**, and a 640px drawer is a width `sheet.tsx` §1.2/C12 has already
 * refused in writing (*"NOT 648px: at 1280px a 648px drawer leaves 552px of
 * content, which is narrower than a detail page's main column and destroys the
 * only reason a drawer beat a modal. Width is solved by the full-page escape at
 * `/entity/:entityId`"*). That escape is this sheet's own footer link.
 *
 * Restacked at 480 the same sweep reports **zero** overflowing elements, on all
 * three tabs, at 1280 and at 1440, in both directions.
 *
 * **Unconditional, not `compact:`.** `compact` is `@media (width < 768px)` — a
 * VIEWPORT query (`globals.css:284`). A 480px panel inside a 1280px viewport
 * never matches it, so the `compact:` overrides this file used to carry could
 * not have restacked anything. The single column is now the only arrangement,
 * which is also why `RiderRail` no longer needs a `compact:` rule of its own:
 * its separating edge is a `border-b`, always.
 *
 * The order — summary first, then detail — is the one the design spec already
 * ordains for the one-column case (§6.2: *"the rail restacks above the tab row
 * — it is the summary, and a summary below its own detail is not a summary"*).
 * Nothing is dropped and nothing is reordered inside either part.
 */
export function RiderProfile({ rider, reads, t, language }: RiderProfileProps) {
  return (
    /* **`-m-3` cancels `ShellLayer`'s body padding, deliberately.** The rail is
       a GROUND and a ground that stops 12px short of the sheet's edge reads as
       a card that failed to fill, not as a column. The band above it already
       bleeds for the same reason. The utility is symmetric, so it mirrors. */
    <div className="-m-3 flex min-h-full flex-col">
      <RiderRail
        rider={rider}
        subscription={reads.subscriptions.data?.items.at(0) ?? null}
        subscriptionLoading={reads.subscriptions.status === 'loading'}
        t={t}
        language={language}
      />
      <RiderPanels rider={rider} reads={reads} t={t} language={language} />
    </div>
  )
}

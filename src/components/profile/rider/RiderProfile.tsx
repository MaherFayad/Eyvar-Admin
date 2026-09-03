/**
 * The rider sheet's body: a rail of standing facts and a column of history,
 * and the four reads that feed both.
 *
 * ```
 *  ┌───────────────┬──────────────────────────────────────────────┐
 *  │ WALLET        │  Activity 4 │ Money 4 │ Identity             │
 *  │ UNDER REVIEW  │  ────────────────────────────────────────    │
 *  │ PLAN          │  ● Open right now                            │
 *  │ TRIPS         │  EARLIER …                                   │
 *  │ CHURN RISK    │                                              │
 *  └───────────────┴──────────────────────────────────────────────┘
 *      ~1/3, --color-muted        the rest, --color-card
 * ```
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
 *   §9.1       the two columns are a flex row and reverse with the document;
 *              the rail's separating rule is `border-e`, which follows.
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

export function RiderProfile({ rider, reads, t, language }: RiderProfileProps) {
  return (
    /* **`-m-3` cancels `ShellLayer`'s body padding, deliberately.** The rail is
       a GROUND and a ground that stops 12px short of the sheet's edge reads as
       a card that failed to fill, not as a column. The band above it already
       bleeds for the same reason. The utility is symmetric, so it mirrors.

       **Two columns at every width the console supports, one only on a phone.**
       Not the `wide` variant: that is a 1344px VIEWPORT query and this sheet is
       `max-w-measure` inset 24px, so at the 1280 floor it is already 1232px
       across — wide enough for a 320px rail and 900px of history. Gating on the
       viewport would collapse a 1232px surface into one column to solve a
       problem it does not have. `compact` is the real break: below 768 the
       modal goes edge to edge and a rail beside a tab set has nowhere to go. */
    <div className="-m-3 flex min-h-full flex-row items-stretch compact:flex-col">
      <div className="w-1/3 max-w-xs shrink-0 compact:w-full compact:max-w-none">
        <RiderRail
          rider={rider}
          subscription={reads.subscriptions.data?.items.at(0) ?? null}
          subscriptionLoading={reads.subscriptions.status === 'loading'}
          t={t}
          language={language}
        />
      </div>
      <RiderPanels rider={rider} reads={reads} t={t} language={language} />
    </div>
  )
}

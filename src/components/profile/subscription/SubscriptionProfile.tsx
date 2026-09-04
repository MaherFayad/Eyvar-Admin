/**
 * The subscription sheet's body: **the commute it repeats**, then the standing
 * facts, then the panels.
 *
 * ```
 *  ┌──────────────────────────────────────┐
 *  │            the map                   │   the daily route, with the legs
 *  │   ● ⇄──── ▪   [legs] [paid]          │   and the money floating on it
 *  ├──────────────────────────────────────┤
 *  │ CAPTAIN                              │   the rail, --color-muted
 *  │ CYCLE                                │
 *  │ HELD IN ESCROW                       │
 *  │ RENEWAL LIKELIHOOD                   │
 *  ├──────────────────────────────────────┤
 *  │  Details │ Timeline 2                │   the panels, --color-card
 *  └──────────────────────────────────────┘
 *            --ev-drawer-w, 480
 * ```
 *
 * ## Why a subscription leads with a map
 *
 * Because the owner settled what a subscription is: *"all subscriptions 100% is
 * either one way or round trip that's repeated every day of the subscription."*
 * A cycle is a commute, the commute is the thing the rider bought, and no
 * arrangement of labelled pairs says *where it goes* as fast as a picture. The
 * two numbers that qualify it — how much of the commitment is left, and what was
 * paid — float on it, exactly as the waiting clock and the fare do on a request.
 *
 * The route came onto the record for this (`types/subscription.ts`): it was a
 * modelling gap, not a display one. `SubscriptionMap` draws the record's own two
 * fields and never a scan of its legs, because most cycles have no leg recorded
 * and a record whose route depends on rows that may not exist cannot answer for
 * itself.
 *
 * ## One read, and the actions are the caller's
 *
 * There are no collection reads here — `SubscriptionPanels`'s header sets out
 * why. The three commands live in the sheet's FOOTER, mounted by
 * `ProfileLayer`, so this component stays a body that reads a record and the
 * write stays in one place (`components/actions/subscription.ts`).
 *
 * Rules applied
 *   §11.3      the loading state is `SubscriptionSkeleton` — the same map band,
 *              the same rail blocks, the same tab row. Never a spinner.
 *   §9.1       nothing is placed on a physical side.
 */

import type { Subscription } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { SubscriptionFigures } from './SubscriptionFigures'
import { SubscriptionMap, subscriptionPoints } from './SubscriptionMap'
import { SubscriptionPanels } from './SubscriptionPanels'
import { SubscriptionRail } from './SubscriptionRail'

export interface SubscriptionProfileProps {
  subscription: Subscription
  /** The rider's own record. `SubscriptionPanels` says why it is a prop. */
  riderHref?: string | null
  captainHref?: string | null
  t: Translate
  language: Language
}

export function SubscriptionProfile({
  subscription,
  riderHref = null,
  captainHref = null,
  t,
  language,
}: SubscriptionProfileProps) {
  const { from, to } = subscriptionPoints(subscription)
  const hasMap = from !== null || to !== null
  const figures = (
    <SubscriptionFigures subscription={subscription} t={t} language={language} />
  )

  return (
    /* `-m-3` cancels `ShellLayer`'s body padding: the map is a GROUND, edge to
       edge, and a map that stops 12px short reads as a card that failed to
       fill. The utility is symmetric, so it mirrors. */
    <div className="-m-3 flex min-h-full flex-col">
      {hasMap ? (
        <SubscriptionMap
          subscription={subscription}
          from={from}
          to={to}
          figures={figures}
          t={t}
          language={language}
        />
      ) : (
        /* **Neither end resolved — so there is no picture, and the two figures
           still have to be here.** Losing the gazetteer must not cost an
           operator the numbers they opened the sheet to read. */
        <div className="flex flex-col gap-3 border-b border-border bg-muted px-4 py-3">
          {figures}
          <p className="text-sm text-muted-foreground">{t('profile.request.map.none')}</p>
        </div>
      )}

      <SubscriptionRail subscription={subscription} t={t} language={language} />
      <SubscriptionPanels
        subscription={subscription}
        riderHref={riderHref}
        captainHref={captainHref}
        t={t}
        language={language}
      />
    </div>
  )
}

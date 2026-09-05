/**
 * The subscription sheet's head — the same deep-green field the other four
 * sheets carry, over the thing this record is: **a commute, bought by the
 * week.**
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────┬───┐
 *  │  SUBSCRIPTION · SUB-1041                                         │ ✕ │  --color-hero-label
 *  │  Al Narjis District → KAFD                                       │   │  --text-band, hero-fg
 *  │  Nora Al-Harbi │ Weekly Economy │ Economy                        │   │  hero-muted
 *  │  Expiring                                                        │   │  the badge
 *  └──────────────────────────────────────────────────────────────────┴───┘
 * ```
 *
 * ## Why the ROUTE is the title here too
 *
 * The owner settled what a subscription is: *"all subscriptions 100% is either
 * one way or round trip that's repeated every day of the subscription."* So the
 * record's subject is the same shape as a request's — a journey — and the title
 * is the same construction, from the same key, with the same mirrored arrow.
 * The plan name is a meta item beside the rider, because *Weekly Economy*
 * describes what was bought and the route describes what it is for.
 *
 * `requests.route` is reused rather than re-minted, and that is load-bearing:
 * its Arabic entry carries `←`, and §9.5 fixes a mirroring glyph at
 * string-construction time. A second key would be a second answer to which way
 * the commute points.
 *
 * Rules applied
 *   §6.2       ONE header — this replaces `ShellLayer`'s chrome bar rather than
 *              sitting under it.
 *   tokens     `--color-hero*`, never `--ev-brand` (a control fill).
 *   §7.2       the close control takes the band's own ring.
 *   §9.1       logical utilities throughout; the separators are 1px spans.
 *   AC-73      the id and the route are each `<bdi>`-isolated.
 *   R5a        the badge is `REQUEST_STATUS`'s sibling in `profile/domain.ts` —
 *              `cancelled` and `expired` are neutral, `expiring` and `at-risk`
 *              are the one warning tone. There is no red badge.
 */

import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/icons'
import { SheetClose, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/StatusBadge'
import type { ProfileRef, Subscription } from '@/data/types'
import type { Translate } from '@/lib'
import { SUBSCRIPTION_STATUS } from '../domain'

export interface SubscriptionBandProps {
  entity: ProfileRef
  /** `null` until the record arrives. The id does not wait for it. */
  subscription: Subscription | null
  t: Translate
}

export function SubscriptionBand({ entity, subscription, t }: SubscriptionBandProps) {
  /* Built as data so the row drops an absent fact without leaving an orphan
     separator — the separators go BETWEEN what survives. */
  const meta: string[] = subscription
    ? [subscription.riderName, subscription.planName, subscription.vehicleClass].filter(
        (value) => value !== '',
      )
    : [entity.subtitle ?? ''].filter((value) => value !== '')

  const status = subscription === null ? null : SUBSCRIPTION_STATUS[subscription.status]

  /* The commute, from the key that carries the mirroring arrow. The id is the
     fallback while the record is in flight — a real value, and the same code
     the eyebrow above already prints. */
  const title =
    subscription === null
      ? entity.title
      : t('requests.route', {
          pickup: subscription.pickup,
          destination: subscription.destination,
        })

  return (
    <div className="relative flex flex-col gap-2 bg-hero px-6 py-5 text-hero-foreground">
      <SheetClose asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute end-3 top-3 text-hero-foreground hover:bg-hero-2 hover:text-hero-foreground focus-visible:ring-hero-foreground focus-visible:ring-offset-hero"
        >
          <CloseIcon aria-hidden="true" />
          <span className="sr-only">{t('shell.layer.close')}</span>
        </Button>
      </SheetClose>

      {/* What KIND of record, then WHICH one — two independent labels, never
          one interpolated string (§9.6). */}
      <p className="flex items-center gap-1.5 pe-8 text-2xs font-medium tracking-widest text-hero-label uppercase">
        <span>{t(`profile.kind.${entity.entityType}`)}</span>
        <span aria-hidden="true">·</span>
        <bdi className="tabular-nums">{entity.entityId}</bdi>
      </p>

      <SheetTitle className="text-band font-medium break-words text-hero-foreground">
        <bdi>{title}</bdi>
      </SheetTitle>

      {meta.length > 0 && (
        <ul
          role="list"
          className="flex list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hero-muted"
        >
          {meta.map((value, index) => (
            <li key={value} className="flex items-center gap-3">
              {index > 0 && (
                <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hero-line" />
              )}
              <bdi>{value}</bdi>
            </li>
          ))}
        </ul>
      )}

      {status && (
        <div className="flex w-fit items-center gap-2">
          <StatusBadge tone={status.tone}>{t(status.key)}</StatusBadge>
        </div>
      )}
    </div>
  )
}

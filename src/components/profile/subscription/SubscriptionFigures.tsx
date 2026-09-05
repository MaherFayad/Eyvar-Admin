/**
 * **The two numbers an operator opens a subscription for**: how much of the
 * commitment is left, and what was paid for it.
 *
 * They float over the map, in the same two corners the request sheet puts its
 * waiting clock and its fare — the owner's instruction (*"some of the details
 * floating on the map"*), and the same reading: both are facts about the
 * journey, and the journey is the picture.
 *
 * Exported separately from the map for the same reason `RequestFigures` is: a
 * commute whose place names the gazetteer does not know has **no map**, and
 * losing the picture must not also lose the two figures. The sheet's no-map
 * branch renders exactly this row on the rail's own ground.
 *
 * ## Why `legs`, and why the meter is under the numeral
 *
 * `tripsCompleted / tripsIncluded` is the commitment's own progress and it is
 * what an operator is deciding against — a cycle with four of five legs used
 * and a day to run is a different conversation from one with none used and a
 * week left. The meter repeats it as a shape, and the sentence beneath repeats
 * it in words, so the ratio survives greyscale and survives a reader who never
 * looks at the canvas (§7.5).
 *
 * **A round trip does not double the count.** `tripsIncluded` is the plan's own
 * allowance and `tripKind` is how each day is spent; multiplying one by the
 * other here would be this file inventing a figure the record does not carry.
 * The direction is stated on the map's endpoint card, where it belongs.
 */

import { Money } from '@/components/Money'
import type { Subscription } from '@/data/types'
import { formatCount, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

/**
 * How many legs the meter draws before it gives up and lets the sentence carry
 * the ratio alone. A `monthly` plan includes 22, and past roughly a dozen the
 * segments are 3px wide in a floating card and read as a texture rather than as
 * a count — which is worse than the sentence already under them.
 * `RiderRail`'s plan meter sets the same ceiling for the same measurement.
 */
const MAX_METER_SEGMENTS = 12

export interface SubscriptionFiguresProps {
  subscription: Subscription
  t: Translate
  language: Language
}

export function SubscriptionFigures({ subscription, t, language }: SubscriptionFiguresProps) {
  const { tripsCompleted, tripsIncluded } = subscription
  const left = Math.max(0, tripsIncluded - tripsCompleted)

  return (
    <div className="flex items-start justify-between gap-2">
      <FloatCard label={t('profile.subscription.figure.legs')}>
        <span className="text-xl font-medium tabular-nums text-foreground">
          <bdi>
            {t('profile.value.ratio', {
              used: formatCount(tripsCompleted, language),
              total: formatCount(tripsIncluded, language),
            })}
          </bdi>
        </span>
        <LegMeter used={tripsCompleted} total={tripsIncluded} />
        <span className="text-xs text-muted-foreground">
          <bdi>
            {t('profile.subscription.figure.legsLeft', {
              count: formatCount(left, language),
            })}
          </bdi>
        </span>
      </FloatCard>

      <FloatCard label={t('profile.subscription.figure.paid')} align="end">
        <span className="flex items-baseline gap-1">
          <Money amount={subscription.paidHalalas} unit="none" className="text-xl font-medium" />
          <span className="text-2xs text-muted-foreground">
            {t('profile.request.rail.unit')}
          </span>
        </span>
      </FloatCard>
    </div>
  )
}

/** One floating card, on its own ground — a figure read against a street is not read at all. */
function FloatCard({
  label,
  align = 'start',
  children,
}: {
  label: string
  align?: 'start' | 'end'
  children: React.ReactNode
}) {
  return (
    <div
      data-numeric
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-lg border border-border bg-card/95 px-3 py-2',
        align === 'end' ? 'items-end text-end' : 'items-start',
      )}
    >
      <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

/**
 * The legs, one segment each.
 *
 * `aria-hidden`, deliberately: the numeral above and the sentence below already
 * carry the ratio, so a screen reader that heard this too would hear it three
 * times. §7.5 is satisfied by the words — the meter is the redundant carrier,
 * not the only one.
 */
function LegMeter({ used, total }: { used: number; total: number }) {
  if (total <= 0 || total > MAX_METER_SEGMENTS) return null
  return (
    <div aria-hidden="true" className="flex w-full gap-0.5 py-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1 min-w-1 flex-1 rounded-sm',
            index < used ? 'bg-primary' : 'bg-border-control',
          )}
        />
      ))}
    </div>
  )
}

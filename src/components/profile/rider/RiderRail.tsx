/**
 * The rider sheet's left rail — four standing facts, one per block, on a light
 * ground with a hairline between each.
 *
 * ```
 *  WALLET                  <- label, --color-muted-foreground, 12px uppercase
 *  200.00  SAR             <- --text-kpi-lead numeral + the unit as a caption
 *  ┌────────────────┐
 *  │ 98.00 SAR held │      <- amber, and only when the LEDGER says so
 *  └────────────────┘
 *  ────────────────────────
 *  PLAN
 *  Expired                 <- the word, in ink. Never red — see below.
 *  ▭▭▭▭▭                   <- five empty segments
 *  0 of 5 trips used
 *  Weekly Economy · ended 8 Jun
 *  ────────────────────────
 *  TRIPS COMPLETED
 *  0
 *  Since 22 Jun
 *  Lifetime value    0.00 SAR
 *  ────────────────────────
 *  CHURN RISK
 *  High                    <- RED, and only at `high`. See `churn.ts`.
 *  The plan lapsed with nothing used.
 * ```
 *
 * Rules applied
 *   R5a        **one red in this rail, and it is the owner's fifth permitted
 *              use**: a `high` churn level. `medium` and `low` are ink, and
 *              `Expired` is still ink — R5a's four uses plus one is not a
 *              licence for a status word, and the plan's status did not gain
 *              one. The scope, the reason it is only `high`, and the token that
 *              is still pending are all in `churn.ts`; nothing here decides
 *              anything about it.
 *   §12.1      the churn block is **not a badge**, and the colour did not make
 *              it one. Churn risk is a PREDICTION and the badge family
 *              communicates STATUS; a prediction wearing status chrome claims a
 *              certainty the value does not have. Label plus word, no fill, no
 *              border, not focusable.
 *   §7.5       and the colour is never the only carrier: the level is a word,
 *              the basis is the sentence beneath it, and the hue is third.
 *   §8.2       the churn REASON is mandatory, not decorative, and it comes from
 *              `Rider.churnReason` — a `LocalisedText` the server mints. It is
 *              never composed here: a level with a reason the client inferred
 *              would give the sheet and the page two explanations of one badge.
 *   §8.3.1     every figure goes through `Money` / `formatCount` /
 *              `formatDate`. `Money unit="none"` plus the unit as a caption is
 *              the same construction §8.3.1 licenses for a table — the unit
 *              stated once, adjacent to the column of figures, never rebuilt as
 *              a string.
 *   §8.3.4     **the held money is NOT in the wallet block, and that is a
 *              correction rather than a layout preference.** The design draws
 *              `98.00 SAR HELD` as a pill under the balance, which states that
 *              98.00 of the rider's 200.00 is unavailable. It is not: the
 *              wallet ledger holds two settled credits closing 200.00 and its
 *              `pendingHalalas` is **zero**. The 98.00 is on a different ledger
 *              — money the platform captured from a card and has not settled
 *              onward — and none of the rider's balance is held.
 *
 *              §8.3.4 requires a pending amount to be a separate labelled line
 *              beneath a balance and never inside it, so it is its own block
 *              under its own rule, labelled `Payments under review` and
 *              deliberately not `Held`: `Held` under a wallet balance reads as
 *              *held out of your balance*, which is the false claim. The badge
 *              on that payment's own row in the Money tab still says `Held`,
 *              because a state on a record and a summary label are different
 *              things.
 *
 *              A rider with nothing under review renders **neither the block
 *              nor its rule** — no zero, no em dash.
 *   §8.3.1     the figures are `Rider.walletBalanceHalalas` and
 *              `Rider.heldHalalas`, both server fields off the ONE record read.
 *              Nothing is summed here: `getRider` covers the whole money block
 *              in one read precisely so three figures on one line do not have
 *              three loading states, and so no surface re-derives a total from
 *              a page of rows.
 *   §3.5       a block with no value states so in words. `No plan on this
 *              record`, never an em dash — `—` is reserved for
 *              not-applicable (§8.3.1) and a rider with no plan is not that.
 *   §9.1       logical utilities only. The meter is a flex row, so its segments
 *              fill from the inline-start in both directions with no second
 *              rule; the label/value line uses `justify-between`, which
 *              reverses with the document.
 */

import { Money } from '@/components/Money'
import { Skeleton } from '@/components/ui/skeleton'
import type { Rider, Subscription } from '@/data/types'
import {
  formatCount,
  formatDate,
  formatLocalisedText,
  type Language,
  type Translate,
} from '@/lib'
import { CHURN_RISK } from '@/screens/operations/people/domain'
import { SUBSCRIPTION_STATUS } from '../domain'
import { churnLevelInk } from './churn'
import { cn } from '@/lib/utils'

/**
 * How many plan legs the meter will draw before it gives up and lets the
 * sentence carry the ratio alone.
 *
 * A `weekly` plan includes 5 and a `monthly` 20-odd; past roughly a dozen the
 * segments are 3px wide in a 320px rail and read as a texture rather than as a
 * count, which is worse than the sentence that is already underneath them.
 */
const MAX_METER_SEGMENTS = 12

export interface RiderRailProps {
  /**
   * The record, and it carries the whole money block — balance and held — so
   * the rail's two figures cannot arrive at different times or from different
   * reads. No ledger is fetched here.
   */
  rider: Rider
  /** The newest plan cycle. `null` is the rider who holds none. */
  subscription: Subscription | null
  subscriptionLoading: boolean
  t: Translate
  language: Language
}

export function RiderRail({
  rider,
  subscription,
  subscriptionLoading,
  t,
  language,
}: RiderRailProps) {
  const churn = CHURN_RISK[rider.churnRisk]

  return (
    /* The rail sits ABOVE the panels at every width the drawer has (see
       `RiderProfile`), so its separating rule is a `border-b` on the block
       axis — one edge, and one that has no side to mirror. It was a `border-e`
       while the rail was a column beside the panels. */
    <div className="flex flex-col divide-y divide-border border-b border-border bg-muted">
      {/* ── wallet ─────────────────────────────────── */}
      <RailBlock label={t('profile.section.wallet')}>
        <Figure>
          <Money
            amount={rider.walletBalanceHalalas}
            unit="none"
            className="text-kpi-lead font-medium"
          />
          <span className="text-2xs text-muted-foreground">{t('profile.rider.rail.unit')}</span>
        </Figure>
      </RailBlock>

      {/* ── payments under review ───────────────────────── */}
      {/* Its own block under its own rule, and ABSENT entirely at zero — the
          `&&` is the rule too, because `divide-y` puts the hairline on the
          block and an unrendered block draws none. */}
      {rider.heldHalalas !== 0 && (
        <RailBlock label={t('profile.rider.rail.underReview')}>
          <Figure>
            <Money
              amount={rider.heldHalalas}
              unit="none"
              className="text-xl font-medium"
            />
            <span className="text-2xs text-muted-foreground">{t('profile.rider.rail.unit')}</span>
          </Figure>
          {/* **The shared fragment, not a second spelling of it** — owner
              amendment 3, §16.3 #2. `Captured, not settled. Not part of the
              balance.` was two sentences and only the second was load-bearing:
              the block's own label already says *not settled*. The clause that
              remains is the key the money rows already render, so one fact is
              stated in one set of words on both surfaces.

              The page's strip renders NO held line at all and needs no
              equivalent (§16.4, `RiderProfilePage.tsx`): the misread this line
              closes is created by the sheet's single-column stack, where 98.00
              sits directly beneath a balance it is not part of. That asymmetry
              is intentional and is asserted, not tolerated (AC-RP-109). */}
          <p className="text-xs text-muted-foreground">
            {t('profile.rider.money.outsideBalance')}
          </p>
        </RailBlock>
      )}

      {/* ── plan ───────────────────────────────────────────────────── */}
      {/* **`Plan`, not `Subscription` and not `Last plan`.** A bare
          `SUBSCRIPTION` label sits four lines under a header meta row reading
          `On demand` and the two look like a contradiction — they are answers
          to different questions, `Rider.status` and this cycle's own status. And
          `Last plan` is wrong the moment the plan is live. `Plan` is true in
          both cases and the status word beneath it says which. */}
      <RailBlock label={t('profile.rider.rail.plan')}>
        {subscriptionLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : subscription === null ? (
          <p className="text-sm text-muted-foreground">{t('profile.rider.rail.noPlan')}</p>
        ) : (
          <>
            {/* Ink, at weight, with no fill. R5a: red is a destructive button, a
                page-level critical banner, a breached-row marker and a map
                marker. A status word is not on that list and adding it would be
                use #5, which needs a ruling nobody has written. */}
            <p className="text-xl font-medium text-foreground">
              {t(SUBSCRIPTION_STATUS[subscription.status].key)}
            </p>
            <PlanMeter used={subscription.tripsCompleted} total={subscription.tripsIncluded} />
            <p className="text-sm text-foreground">
              <bdi className="tabular-nums">
                {t('profile.rider.rail.planLegs', {
                  used: formatCount(subscription.tripsCompleted, language),
                  total: formatCount(subscription.tripsIncluded, language),
                })}
              </bdi>
            </p>
            {/* The cycle's END date, which is what makes `Expired` legible — the
                word alone says the state and not when it happened. */}
            <p className="text-xs text-muted-foreground">
              <bdi>
                {t(
                  ENDED_STATUSES.has(subscription.status)
                    ? 'profile.rider.rail.planEnded'
                    : 'profile.rider.rail.planEnds',
                  {
                    plan: subscription.planName,
                    date: formatDate(subscription.endsOn, { style: 'day-month', language }),
                  },
                )}
              </bdi>
            </p>
          </>
        )}
      </RailBlock>

      {/* ── trips ──────────────────────────────────────────────────── */}
      <RailBlock label={t('profile.field.totalTrips')}>
        <Figure>
          <span className="text-kpi-lead font-medium tabular-nums text-foreground">
            {formatCount(rider.totalTrips, language)}
          </span>
        </Figure>
        <p className="text-xs text-muted-foreground">
          <bdi>
            {t('profile.rider.rail.since', {
              date: formatDate(rider.joinedAt, { style: 'day-month', language }),
            })}
          </bdi>
        </p>
        <div className="flex items-baseline justify-between gap-3 pt-1 text-sm">
          <span className="text-xs text-muted-foreground">{t('profile.field.lifetimeValue')}</span>
          <Money amount={rider.lifetimeValueHalalas} className="tabular-nums" />
        </div>
      </RailBlock>

      {/* ── churn ──────────────────────────────────────────────────── */}
      <RailBlock label={t('profile.field.churnRisk')}>
        {/* The owner's fifth use of red, scoped to `high` alone — `churn.ts`
            holds the whole ruling and both surfaces read it from there. Still
            a paragraph: no pill, no border, nothing focusable (§12.1). The
            `data-churn-risk` hook is what makes the scope assertable while the
            token is still pending. */}
        <p
          data-churn-risk={rider.churnRisk}
          className={cn('text-xl font-medium', churnLevelInk(rider.churnRisk))}
        >
          {t(churn.key)}
        </p>
        {/* §8.2 — the reason is mandatory. `null` is a real value and means "no
            negative signal", which is a sentence of its own rather than a blank
            (§3.5). */}
        <p className="text-sm text-muted-foreground">
          <bdi>
            {rider.churnReason === null
              ? t('profile.rider.rail.churnNone')
              : formatLocalisedText(rider.churnReason, t)}
          </bdi>
        </p>
      </RailBlock>
    </div>
  )
}

/** The two cycle states whose end date is in the past tense. */
const ENDED_STATUSES: ReadonlySet<Subscription['status']> = new Set(['expired', 'cancelled'])

function RailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section data-numeric className="flex flex-col gap-1.5 px-4 py-4">
      <h3 className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </h3>
      {children}
    </section>
  )
}

/** A numeral and its unit on one baseline. `items-baseline`, so 36px and 11px align. */
function Figure({ children }: { children: React.ReactNode }) {
  return <div className="flex items-baseline gap-1.5">{children}</div>
}

/**
 * The plan's legs, one segment each.
 *
 * `aria-hidden`, deliberately: the sentence directly beneath it already reads
 * `0 of 5 trips used`, so a screen reader that heard both would hear the ratio
 * twice. §7.5 is satisfied by the sentence — the meter is the redundant
 * carrier, not the only one.
 */
function PlanMeter({ used, total }: { used: number; total: number }) {
  if (total <= 0 || total > MAX_METER_SEGMENTS) return null
  return (
    <div aria-hidden="true" className="flex gap-1 py-0.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-sm',
            index < used ? 'bg-primary' : 'bg-border-control',
          )}
        />
      ))}
    </div>
  )
}

/**
 * The subscription sheet's rail — the standing facts about *the commitment
 * itself*, on a light ground with a hairline between each block.
 *
 * ```
 *  CAPTAIN                 <- label, --color-muted-foreground, 12px uppercase
 *  Ahmed Salem             <- the name, in ink
 *  ────────────────────────
 *  CYCLE
 *  19 Jun — 26 Jun
 *  Frozen until 30 Jun     <- only when it is
 *  ────────────────────────
 *  HELD IN ESCROW
 *  69.20 SAR
 *  Released as legs are delivered
 *  ────────────────────────
 *  RENEWAL LIKELIHOOD
 *  92%
 * ```
 *
 * ## What is NOT here
 *
 * The legs and the money paid are on the map above, floating — the owner's
 * instruction and the better reading, since both are facts about the commute.
 * They are therefore not repeated here: a rail restating the ratio 40px under
 * the card already showing it is two carriers for one fact, which is the defect
 * `RequestRail`'s header refuses in the same words.
 *
 * ## Escrow and renewal are the two facts only this record has
 *
 * `escrowHeldHalalas` is money the platform is holding **against legs not yet
 * delivered**, and it is the figure behind what a cancellation refunds — the
 * question `SubscriptionDetailDrawer` was built to answer and the reason this
 * sheet must not drop it. `renewalLikelihoodPercent` is a PREDICTION, so it
 * takes §12.1's treatment: label plus figure, no fill, no border, not
 * focusable. A prediction wearing status chrome claims a certainty the value
 * does not have.
 *
 * Rules applied
 *   §3.5       a block with no value states so in words. `null` escrow is *no
 *              hold* and is not `0`; a `null` likelihood is *no history yet*,
 *              which is a known fact and reads as a sentence, never `—`.
 *   §8.3.1     every figure goes through `Money` / `formatDate` / `formatPercent`.
 *   R5a        no red. `cancelled` is neutral and lives in the band's badge.
 *   §9.1       the rail is a `flex-col` and its rule is a `border-b` on the
 *              block axis — an edge with no side to mirror.
 */

import { Money } from '@/components/Money'
import type { Subscription } from '@/data/types'
import { formatDate, formatPercent, type Language, type Translate } from '@/lib'

export interface SubscriptionRailProps {
  subscription: Subscription
  t: Translate
  language: Language
}

export function SubscriptionRail({ subscription, t, language }: SubscriptionRailProps) {
  return (
    <div className="flex flex-col divide-y divide-border border-b border-border bg-muted">
      {/* ── captain ───────────────────────────────────────────────────── */}
      {/* The one person the commitment names besides the rider, and the fact
          `Change captain` acts on. `null` is the cycle whose request was never
          assigned — a real state, and a sentence rather than an em dash. */}
      <RailBlock label={t('profile.subscription.rail.captain')}>
        {subscription.driverName === null ? (
          <p className="text-sm text-muted-foreground">
            {t('profile.subscription.rail.noCaptain')}
          </p>
        ) : (
          <p className="text-xl font-medium text-foreground">
            <bdi>{subscription.driverName}</bdi>
          </p>
        )}
      </RailBlock>

      {/* ── cycle ─────────────────────────────────────────────────────── */}
      <RailBlock label={t('profile.subscription.rail.cycle')}>
        {/* One key with two named placeholders — never two dates concatenated
            with a dash in JSX, which is the construction §9.6 forbids and which
            no translator could reorder. */}
        <p className="text-xl font-medium text-foreground">
          <bdi>
            {t('profile.subscription.rail.window', {
              from: formatDate(subscription.startedOn, { style: 'day-month', language }),
              to: formatDate(subscription.endsOn, { style: 'day-month', language }),
            })}
          </bdi>
        </p>
        {subscription.frozenUntil !== null && (
          <p className="text-xs text-muted-foreground">
            <bdi>
              {t('profile.subscription.rail.frozenUntil', {
                date: formatDate(subscription.frozenUntil, { style: 'day-month', language }),
              })}
            </bdi>
          </p>
        )}
        {subscription.cancelledAt !== null && (
          <p className="text-xs text-muted-foreground">
            <bdi>
              {t('profile.subscription.rail.cancelledOn', {
                date: formatDate(subscription.cancelledAt, {
                  style: 'day-month-time',
                  language,
                }),
              })}
            </bdi>
          </p>
        )}
      </RailBlock>

      {/* ── escrow ────────────────────────────────────────────────────── */}
      <RailBlock label={t('profile.subscription.rail.escrow')}>
        {subscription.escrowHeldHalalas === null ? (
          <p className="text-sm text-muted-foreground">
            {t('profile.subscription.rail.noEscrow')}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <Money
                amount={subscription.escrowHeldHalalas}
                unit="none"
                className="text-xl font-medium"
              />
              <span className="text-2xs text-muted-foreground">
                {t('profile.request.rail.unit')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('profile.subscription.rail.escrowNote')}
            </p>
          </>
        )}
      </RailBlock>

      {/* ── renewal ───────────────────────────────────────────────────── */}
      {/* §12.1 — a PREDICTION, so no badge and nothing focusable. The rider
          sheet's churn block takes the same treatment for the same reason. */}
      <RailBlock label={t('profile.subscription.rail.renewal')}>
        {subscription.renewalLikelihoodPercent === null ? (
          <p className="text-sm text-muted-foreground">
            {t('profile.subscription.rail.noRenewal')}
          </p>
        ) : (
          <p className="text-xl font-medium tabular-nums text-foreground">
            <bdi>{formatPercent(subscription.renewalLikelihoodPercent, language)}</bdi>
          </p>
        )}
      </RailBlock>
    </div>
  )
}

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

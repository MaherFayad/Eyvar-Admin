/**
 * The request sheet's rail — the standing facts about *who is on this ride*,
 * on a light ground with a hairline between each block.
 *
 * ```
 *  CAPTAIN                 <- label, --color-muted-foreground, 12px uppercase
 *  Ahmed Salem             <- the name, in ink
 *  Assigned 25 Jun 09:10   <- when, or when the reply window closes
 *  ────────────────────────
 *  OWNER
 *  Yousef Al-Balawi
 *  Held since 09:12
 *  ────────────────────────
 *  PLAN                    <- subscription channel only
 *  Weekly
 *  Preferred pickup 07:00
 * ```
 *
 * ## What is NOT here, and where it went
 *
 * The two numbers an operator opens this sheet for — **how long the rider has
 * been waiting** and **what the ride is worth** — are on the map above, floating
 * over the ground the ride happens on. That is the owner's instruction (*"some
 * of the details floating on the map"*) and it is also the better reading: both
 * are facts about the journey, and the journey is the picture.
 *
 * They are therefore **not repeated here**. A rail that restated the waiting
 * time 40px under the card already showing it would be two carriers for one
 * fact, which is the defect `RiderBand`'s own note records against a five-item
 * meta row — the sheet stops having a hierarchy and becomes a list of the same
 * things at different sizes.
 *
 * The one exception is the money's ABSENCE. A request with no quote has nothing
 * for the map to float, so the block appears here instead, carrying the sentence
 * rather than a `0.00 SAR` that would be a different and false claim (§3.5).
 *
 * Rules applied
 *   §3.5       a block with no value states so in words — `Nobody has taken this
 *              ride yet`, never an em dash. `—` is reserved for
 *              not-applicable (§8.3.1), and a request nobody has accepted is
 *              not that; it is the most common row on the queue.
 *   §8.3.1     every figure goes through `Money` / `formatDate`. Nothing here
 *              builds a string out of parts (§9.6).
 *   R5a        no red. A request past its deadline is carried by the countdown
 *              on the map and by the row marker on the queue behind this sheet;
 *              a third red carrier on one record is exactly what R5a caps.
 *   §9.1       logical utilities only. The rail is a `flex-col` and its
 *              separating rule is a `border-b` on the block axis — an edge with
 *              no side to mirror.
 *   §12.1      the captain's name is text, not a badge. A badge communicates a
 *              lifecycle state; a person is not one.
 */

import type { RideRequest } from '@/data/types'
import { formatDate, type Language, type Translate } from '@/lib'

export interface RequestRailProps {
  request: RideRequest
  t: Translate
  language: Language
}

export function RequestRail({ request, t, language }: RequestRailProps) {
  /**
   * **Assigned beats offered, and both beat nobody.** The three are one
   * question — *who is on this ride* — and the record can carry two names at
   * once: a request offered to one captain and then assigned to another keeps
   * `offeredToDriverName` (`types/request.ts` says so at the field). Printing
   * both would make the sheet answer the question twice.
   */
  const captain = request.assignedDriverName ?? request.offeredToDriverName
  const claim = request.claim?.state === 'claimed' ? request.claim : null
  /* One of the two is `null` on every row by construction. */
  const amount =
    request.channel === 'subscription'
      ? request.authorisationHoldHalalas
      : request.quotedFareHalalas

  return (
    <div className="flex flex-col divide-y divide-border border-b border-border bg-muted">
      {/* ── captain ───────────────────────────────────────────────────── */}
      <RailBlock label={t('profile.request.rail.captain')}>
        {captain === null ? (
          <p className="text-sm text-muted-foreground">{t('profile.request.rail.noCaptain')}</p>
        ) : (
          <>
            <p className="text-xl font-medium text-foreground">
              <bdi>{captain}</bdi>
            </p>
            {request.assignedAt !== null ? (
              <p className="text-xs text-muted-foreground">
                <bdi>
                  {t('profile.request.rail.assignedOn', {
                    date: formatDate(request.assignedAt, { style: 'day-month-time', language }),
                  })}
                </bdi>
              </p>
            ) : (
              request.offerExpiresAt !== null && (
                /* The captain app's own 12-second reply window, not ops' promise
                   — `types/request.ts` is explicit that the two are different
                   clocks. Named as a window closing, so it cannot be read as
                   the deadline the countdown on the map is measuring. */
                <p className="text-xs text-muted-foreground">
                  <bdi>
                    {t('profile.request.rail.offerCloses', {
                      time: formatDate(request.offerExpiresAt, {
                        style: 'day-month-time',
                        language,
                      }),
                    })}
                  </bdi>
                </p>
              )
            )}
          </>
        )}
      </RailBlock>

      {/* ── owner ─────────────────────────────────────────────────────── */}
      {/* Who in ops holds this. It is the fact that decides whether an operator
          may act without a take-over confirmation, and the queue behind this
          sheet states it in a column — so the sheet must not be silent about
          it. `Unclaimed` is a real answer, not an absence. */}
      <RailBlock label={t('profile.request.rail.owner')}>
        {claim === null ? (
          <p className="text-sm text-muted-foreground">{t('profile.request.rail.ownerNone')}</p>
        ) : (
          <>
            <p className="text-xl font-medium text-foreground">
              <bdi>{claim.ownerName}</bdi>
            </p>
            <p className="text-xs text-muted-foreground">
              <bdi>
                {t('profile.request.rail.ownerSince', {
                  time: formatDate(claim.claimedAt, { style: 'day-month-time', language }),
                })}
              </bdi>
            </p>
          </>
        )}
      </RailBlock>

      {/* ── plan ──────────────────────────────────────────────────────── */}
      {/* Subscription channel only, and absent entirely on an instant request —
          the `&&` is the rule too, because `divide-y` puts the hairline on the
          block and an unrendered block draws none. */}
      {request.planKey !== null && (
        <RailBlock label={t('profile.request.field.plan')}>
          {/* `subs.plan.*`, the subscriptions queue's own names. A fourth
              spelling of `Weekly` is a fourth thing to translate. */}
          <p className="text-xl font-medium text-foreground">
            {t(`subs.plan.${request.planKey}`)}
          </p>
          {request.preferredPickupTime !== null && (
            <div className="flex items-baseline justify-between gap-3 pt-1 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('profile.request.field.preferredTime')}
              </span>
              {/* A wall-clock time with no date — the rider is asking for a
                  *daily* slot, not one instant (`types/request.ts`). It is
                  stored as `'07:00'` and rendered as it is stored; putting it
                  through `formatDate` would need a date this value does not
                  have. */}
              <bdi className="tabular-nums text-foreground">{request.preferredPickupTime}</bdi>
            </div>
          )}
        </RailBlock>
      )}

      {/* ── the money that has no figure ──────────────────────────────── */}
      {/* Present exactly when the map has nothing to float. `types/request.ts`
          records the case: a request cancelled before a priced route came back.
          The label still names which kind of money is missing, because
          *no estimated fare* and *no authorisation hold* are different facts. */}
      {amount === null && (
        <RailBlock
          label={t(
            request.channel === 'subscription'
              ? 'profile.request.rail.hold'
              : 'profile.request.rail.fare',
          )}
        >
          <p className="text-sm text-muted-foreground">{t('profile.request.rail.noQuote')}</p>
        </RailBlock>
      )}

      {/* **And when there IS a figure, this block is absent.** The number floats
          on the map; its caveat — *quoted, not charged* — is a sentence, and a
          floating card is no place for one, so it is the Money group's caption
          in the Details panel. Repeating the figure here to give the sentence
          somewhere to live would put two carriers on one fact 40px apart, which
          is the thing this rail's header refuses. */}
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

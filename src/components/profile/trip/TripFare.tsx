/**
 * **The fare, and proof that it adds up.**
 *
 * ```
 *  Total fare        29.40
 *  Captain earnings  23.52
 *  Eyvar cut          5.88
 *  Extra stop         0.00
 *  Tip                0.00
 * ```
 *
 * ## The arithmetic is checked here, and said out loud when it fails
 *
 * `fare = captainEarnings + eyvarCut + extraStopFee + tip` is the identity
 * these five lines claim. `platformCutHalalas` is server-computed and **Q7 is
 * open** — four pricing models in the legacy app disagree about commission
 * (escrow embeds a flat 20%, the history builder hardcodes 20%, the rate card
 * says 22%, per-plan `commission` is editable) — so this pane is exactly the
 * surface where a disagreement would show up first.
 *
 * Rather than hide the residual, it is stated, with its size. §9.2's ledger
 * discipline: *a set of figures that claims to decompose a total must be shown
 * to*. `TRP-9106` is seeded with a deliberate −3.00 residual and
 * `clients/integrity.ts`'s `money.trip-split` check exists to find it, so this
 * sentence is reachable rather than theoretical.
 *
 * Integer halalas throughout, so there is no floating-point tolerance to argue
 * about — the residual is exactly zero or it is not.
 *
 * ## Why `Extra stop` renders when it is zero and `Tip` does too
 *
 * §8.3.1 keeps `—` for *not applicable*. No extra stop is a **real zero**: the
 * rider was not charged for one. Hiding the line would leave the reader to
 * guess whether it was zero or unknown, and the total would then have four
 * lines under it that do not obviously add up.
 *
 * R5a: the residual sentence is a standing condition on one record, so it is a
 * **sentence** and not a red badge.
 */

import type { Trip } from '@/data/types'
import { Money } from '@/components/Money'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'

export interface TripFareProps {
  trip: Trip
  /** `?entity=` href for the payment, or `null` when it cannot be resolved. */
  paymentHref: string | null
  t: Translate
  children?: never
}

/**
 * What the four lines fail to account for, in halalas. `0` when the breakdown
 * is sound, which is every trip but the one seeded to prove it is checked.
 */
export function fareResidual(trip: Trip): number {
  return (
    trip.fareHalalas -
    (trip.driverEarningsHalalas +
      trip.platformCutHalalas +
      trip.extraStopFeeHalalas +
      trip.tipHalalas)
  )
}

export function TripFare({ trip, paymentHref, t }: TripFareProps) {
  const residual = fareResidual(trip)

  return (
    <section aria-labelledby="trip-fare-heading" className="flex flex-col gap-2">
      <h3 id="trip-fare-heading" className="text-xs font-semibold text-foreground">
        {t('profile.trip.fare.heading')}
      </h3>

      <dl data-numeric className="flex flex-col gap-1 text-xs">
        <Line label={t('profile.trip.fare.total')} amount={trip.fareHalalas} strong />
        <Line label={t('profile.trip.fare.captain')} amount={trip.driverEarningsHalalas} />
        <Line label={t('profile.trip.fare.platform')} amount={trip.platformCutHalalas} />
        <Line label={t('profile.trip.fare.extraStop')} amount={trip.extraStopFeeHalalas} />
        <Line label={t('profile.trip.fare.tip')} amount={trip.tipHalalas} />
      </dl>

      {residual !== 0 && (
        /* `role="status"` — it appears when a record is opened rather than in
           response to an action, so it is announced without stealing focus. */
        <p role="status" className="text-xs text-muted-foreground">
          {t('profile.trip.fare.reconcile', {
            amount: (residual / 100).toFixed(2),
          })}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {trip.paymentId === null ? (
          /* Not `—`: "no payment was taken" is a known fact about a cancelled
             ride, and §8.3.1 keeps the dash for facts that do not apply. */
          t('profile.trip.fare.noPayment')
        ) : paymentHref === null ? (
          <bdi>{trip.paymentId}</bdi>
        ) : (
          <a
            href={paymentHref}
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            <bdi>{trip.paymentId}</bdi>
          </a>
        )}
      </p>
    </section>
  )
}

/** One line. R4: the amount takes the inline-END and is `tabular-nums`. */
function Line({
  label,
  amount,
  strong = false,
}: {
  label: string
  amount: number
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn('shrink-0', strong ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </dt>
      <dd className={cn('text-end tabular-nums', strong && 'font-semibold')}>
        <Money amount={amount} />
      </dd>
    </div>
  )
}

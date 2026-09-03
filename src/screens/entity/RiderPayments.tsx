/**
 * **The rider's card money** — the movements that are *not* in the wallet
 * balance, and the labelled line §8.3.4 requires for money that is captured and
 * not settled.
 *
 * ```
 *  Payments   2 payments · 98.00 SAR under review ──────────────────────────
 *
 *  Quick ride fare                     Held        23 Jun 21:10    98.00 SAR
 *  Quick ride fare                     Released    17 Jun 20:02    64.00 SAR
 * ```
 *
 * ## Why this is a separate group and not four rows in the ledger
 *
 * A `mada` capture never touched `liability.wallet`. Rendered between the
 * ledger's opening and closing balance rows it is an addend of a sum it is not
 * part of — the four movements sign to `+38.00` against a `200.00` balance —
 * and a money table that visibly does not add up is the worst outcome available
 * on this screen.
 *
 * ## Why the summary line does not say `held`
 *
 * `98.00 SAR held` printed under a wallet balance reads as *held out of your
 * balance*, and it is a false statement here: the wallet ledger's
 * `pendingHalalas` is `0` and **none of this rider's 200.00 is held**. The
 * 98.00 is money the platform captured from a card and has not settled onward,
 * frozen because this rider and one other share an IP. So the group's summary
 * says **under review**, which is what it is, while the payment's own row keeps
 * its `Held` badge — a state badge on a record and a summary label over a group
 * are different things and may legitimately use different words.
 *
 * ## There is no release control here, and that is scope rather than a gap
 *
 * No client operation releases a payment hold, and the hold is a **two-record**
 * finding: lifting it from one profile means overturning it with the other half
 * off screen. The profile surfaces the hold and links to the payment. Surfacing
 * is not deciding, and there is no placeholder button standing in for a decision
 * nobody has made.
 *
 * Rules applied
 *   §8.3.4/AC-312  a pending amount is a separate labelled line, never inside a
 *                  balance.
 *   §7.5           the settlement state is a WORD as well as a tone; `failed`
 *                  and `escalated` carry no tone at all (R5a) and render bare.
 *   §5.4           a truncated list states its end in words.
 *   R8             an empty group is ONE grey sentence, no illustration.
 */

import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { SectionHeading } from '@/components/metrics'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SETTLEMENT_BADGE_TONE,
  type RiderMoneyMovement,
  type RiderMoneyMovements,
} from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatDate, formatLocalisedText, formatMoney } from '@/lib'
import type { Language, Translator } from '@/lib'

export interface RiderPaymentsProps {
  result: AsyncResult<RiderMoneyMovements>
  t: Translator
  language: Language
}

export function RiderPayments({ result, t, language }: RiderPaymentsProps) {
  /* The complement of the ledger's split, from the same flag, so no movement
     can land in both groups or in neither. */
  const payments = (result.data?.movements ?? []).filter((row) => !row.inWalletBalance)
  const underReview = result.data?.heldHalalas ?? 0

  const note =
    result.data === null
      ? null
      : [
          t.plural('entity.rider.payments.count', { count: payments.length }),
          /* Absent, with no orphan separator, when nothing is under review. */
          ...(underReview === 0
            ? []
            : [t('entity.rider.payments.underReview', { amount: formatMoney(underReview) })]),
        ].join(' · ')

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('profile.section.payments')} note={note} />

      {result.status === 'loading' && (
        <div className="flex flex-col gap-2">
          {[0, 1].map((row) => (
            <Skeleton key={row} className="h-8 w-full" />
          ))}
        </div>
      )}

      {result.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('profile.state.error', { section: t('profile.section.payments') })}
          action={{ label: t('profile.state.retry'), onClick: result.refetch }}
        />
      )}

      {result.status !== 'loading' && result.status !== 'error' && payments.length === 0 && (
        <EmptyState kind="no-match" card={false} message={t('profile.rider.money.empty')} />
      )}

      {payments.length > 0 && (
        <ul className="flex list-none flex-col divide-y divide-border">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} t={t} language={language} />
          ))}
        </ul>
      )}
    </section>
  )
}

function PaymentRow({
  payment,
  t,
  language,
}: {
  payment: RiderMoneyMovement
  t: Translator
  language: Language
}) {
  const tone = SETTLEMENT_BADGE_TONE[payment.state]
  const label = t(`fin.settlement.${payment.state}`)

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 first:pt-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm text-foreground">
          {formatLocalisedText(payment.label, t)}
        </span>
        <span className="text-xs text-muted-foreground">
          {/* The payment this row IS, as a link into its own record. `?entity=`
              opens the 360° layer over this page rather than replacing it. */}
          {payment.paymentId === null ? (
            <bdi className="tabular-nums">{payment.id}</bdi>
          ) : (
            <Link
              to={`?entity=${payment.paymentId}`}
              className="rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <bdi className="tabular-nums">{payment.paymentId}</bdi>
            </Link>
          )}
          <span aria-hidden="true"> · </span>
          <bdi className="tabular-nums">
            {formatDate(payment.at, { style: 'day-month-time', language })}
          </bdi>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* R5a — `failed` and `escalated` get no badge; the word carries it. */}
        {tone === null ? (
          <span className="text-sm font-medium text-foreground">{label}</span>
        ) : (
          <StatusBadge tone={tone}>{label}</StatusBadge>
        )}
        {/* §3.1 — a positive amount. The direction is not a sign here: every row
            in this group is money leaving the rider, and the group says so. */}
        <Money amount={payment.amountHalalas} className="text-sm" />
      </div>
    </li>
  )
}

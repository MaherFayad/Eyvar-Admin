/**
 * **The trip record** — the drawer behind `Telemetry` on Operations › Trips.
 * `surfaces.md`: a record read beside the list it came from is a drawer.
 *
 * ## What this pane could not do before, and why
 *
 * It took the **list row** as a prop. `Trip` has 25 fields and the index reads
 * every one of them, so nothing was technically missing — but the shape said
 * *"this pane can only ever show what the table already fetched"*, and
 * `getTrip` (`clients/trips.ts:139`) had **no consumer anywhere in the
 * product**. A detail pane that cannot issue its own read cannot grow, cannot
 * refresh after a mutation, and has no loading state, no error state and no
 * not-found state — three of `states.md`'s four were structurally unreachable.
 *
 * It now takes a `tripId` and reads. All four states are here, and the drawer
 * opens on the id rather than on a snapshot, so a flag written from the row
 * kebab is visible the next time the record is opened.
 *
 * ## The eight fields it dropped, and why two of them mattered
 *
 * `latenessMinutes` · `endedAt` · `route` · `subscriptionId` ·
 * `extraStopFeeHalalas` · `flagged` · `stateDesynced` · `paymentId`.
 *
 * Two are not cosmetic:
 *
 * **`flagged`.** It is the field this screen's own row action *writes*, and the
 * pane that is supposed to be the full record never showed it. An operator
 * could flag a trip, open it, and see no sign that they had.
 *
 * **`extraStopFeeHalalas`.** Its absence meant the fare breakdown's lines did
 * not add up to its total on any trip with an extra stop — a pane that shows
 * `Total 41.00` over `Payout 30.00 · Fee 8.00 · Tip 0.00` and leaves the
 * operator to wonder about the missing 3.00. The line is here, and the pane
 * now **checks the arithmetic and says so when it fails**, which is §9.2's
 * ledger discipline applied to a breakdown: a set of figures that claims to
 * decompose a total must be shown to.
 *
 * ## P8-T1
 *
 * Every entity this record names — the rider, the captain, the subscription,
 * the payment — is a real `<Link>` into the 360° layer. A record pane that
 * names four entities and opens none of them is the reason an operator keeps
 * the global search box open beside it.
 *
 * Rules applied
 *   AC-36        all four states, in a surface small enough that people skip
 *                them. `not-found` is its own sentence naming the id (§9.2).
 *   §8.3.1       `—` is not-applicable only. A cancelled trip has no distance
 *                and no duration; `0` would be a lie, and legacy computes a
 *                platform cut from that lie (`:3422`).
 *   R4           every money and count figure is inline-END and `tabular-nums`.
 *   §9.1 / AC-73 `<bdi>` on every numeric and date run: `6.5 km` renders as
 *                `km 6.5` in an RTL paragraph without it.
 *   R5a          a flagged trip is `warning`. There is no red badge.
 *   §7.2         the sheet's own close control keeps its focus ring; nothing
 *                here writes `outline-none`.
 */

import { useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { getTrip } from '@/data/clients'
import type { Trip } from '@/data/types'
import { useAsync } from '@/hooks'
import { ABSENT, formatDate, type Language, type Translate } from '@/lib'
import { EntityLink, useEntityLinks } from '../EntityLink'

interface TripDetailDrawerProps {
  /** The record to read. `null` closes the drawer and cancels nothing. */
  tripId: string | null
  onClose: () => void
  language: Language
  t: Translate
}

export function TripDetailDrawer({ tripId, onClose, language, t }: TripDetailDrawerProps) {
  /* `enabled` holds the read until there is an id. The drawer is mounted by the
     screen for the whole session, so an unconditional read would fetch on every
     page load and hold a stale record by the time one is wanted. */
  const trip = useAsync<Trip>((signal) => getTrip(tripId ?? '', signal), {
    /* Keyed by the trip id, so one trip's record can never serve under
       another's - the failure mode `useAsync.ts:66-72` warns about. */
    deps: [tripId],
    enabled: tripId !== null,
    cacheKey: 'trips.get',
  })

  const record = trip.data ?? null

  return (
    <Sheet open={tripId !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-[460px]">
        <SheetHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base font-semibold tabular-nums">
              <bdi>{tripId ?? ''}</bdi>
            </SheetTitle>
            {record !== null && (
              <span className="flex items-center gap-1.5">
                {/* R5a — `warning`, never red, and it is the field this
                    screen's own row action writes. */}
                {record.flagged && <StatusBadge tone="warning">{t('trips.flagged')}</StatusBadge>}
                <StatusBadge tone={record.status === 'done' ? 'success' : 'info'}>
                  {t(`trips.status.${record.status}`)}
                </StatusBadge>
              </span>
            )}
          </div>
          <SheetDescription className="text-xs">
            {record === null
              ? ' '
              : t('trips.route', {
                  pickup: record.pickup ?? record.route,
                  destination: record.destination ?? record.route,
                })}
          </SheetDescription>
        </SheetHeader>

        {/* AC-36 — loading, error, empty (not found), content, in that order. */}
        {trip.status === 'loading' && (
          <div className="py-4">
            <LoadingSkeleton pattern="P2" />
          </div>
        )}

        {trip.status === 'error' && (
          /* Uncarded: the sheet is already the surface, and a card inside it
             draws a second frame. */
          <ErrorState
            scope="card"
            card={false}
            message={t('trips.drawer.error')}
            action={{ label: t('state.pageError.action'), onClick: trip.refetch }}
          />
        )}

        {trip.status === 'empty' && (
          /* §9.2 `overlay-not-found` — the sentence NAMES the id that was
             looked for, so the operator can tell a typo from a deletion. */
          <EmptyState
            card={false}
            kind="no-match"
            message={t('trips.drawer.notFound', { id: tripId ?? '' })}
          />
        )}

        {trip.status === 'content' && record !== null && (
          <TripRecord record={record} language={language} t={t} />
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ─────────────────────────────── the record ─────────────────────────────── */

function TripRecord({
  record,
  language,
  t,
}: {
  record: Trip
  language: Language
  t: Translate
}) {
  /* **P8-T1 — resolution is ASKED.** Four ids on this record, asked once each,
     and a name whose entity does not resolve renders as text with its reason
     rather than as a link into the overlay's own not-found state. */
  const hrefFor = useEntityLinks([
    record.riderId,
    record.driverId,
    record.subscriptionId,
    record.paymentId,
  ])
  /**
   * **The breakdown has to add up, and this is where that is checked.**
   *
   * `fare = driverEarnings + platformCut + extraStopFee + tip` is the identity
   * the four lines claim. `platformCutHalalas` is server-computed and **Q7 is
   * open** — four pricing models disagree about commission — so this pane is
   * exactly the surface where a disagreement would surface first. Rather than
   * hide it, the residual is stated. Integer halalas throughout, so there is no
   * floating-point tolerance to argue about.
   */
  const residual = useMemo(
    () =>
      record.fareHalalas -
      (record.driverEarningsHalalas +
        record.platformCutHalalas +
        record.extraStopFeeHalalas +
        record.tipHalalas),
    [record],
  )

  return (
    <div className="flex flex-col gap-4 py-4 text-xs">
      {/* ── route ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <Field label={t('trips.drawer.pickup')} value={record.pickup ?? record.route} />
        <div className="flex items-center gap-3 text-muted-foreground">
          <bdi>
            {record.distanceKm === null
              ? ABSENT
              : t('trips.drawer.km', { km: record.distanceKm })}
          </bdi>
          <span aria-hidden="true">·</span>
          <bdi>
            {record.durationMinutes === null
              ? ABSENT
              : t('trips.drawer.minutes', { minutes: record.durationMinutes })}
          </bdi>
        </div>
        <Field label={t('trips.drawer.destination')} value={record.destination ?? record.route} />
      </section>

      {/* ── people (P8-T1) ───────────────────────────────────────────── */}
      <Group title={t('trips.drawer.people')}>
        <Row label={t('trips.col.rider')}>
          <EntityLink
            href={hrefFor(record.riderId)}
            label={t('trips.open.rider', { name: record.riderName })}
            reason={t('trips.entity.unresolved')}
            reasonId="trip-drawer-rider-unresolved"
          >
            {record.riderName}
          </EntityLink>
        </Row>
        <Row label={t('trips.col.captain')}>
          {/* §11.2 — a captain that cannot be resolved is plain text with the
              reason, never a dead link. */}
          <EntityLink
            href={hrefFor(record.driverId)}
            label={t('trips.open.captain', { name: record.driverName ?? '' })}
            reason={
              record.driverId === null
                ? t('trips.captain.none.reason')
                : t('trips.entity.unresolved')
            }
            reasonId="trip-drawer-captain-absent"
          >
            {record.driverName ?? t('trips.captain.none')}
          </EntityLink>
        </Row>
      </Group>

      {/* ── timing ───────────────────────────────────────────────────── */}
      <Group title={t('trips.drawer.timing')}>
        <Row label={t('trips.col.started')}>
          <bdi>{formatDate(record.startedAt, { style: 'day-month-time', language })}</bdi>
        </Row>
        <Row label={t('trips.col.ended')}>
          {record.endedAt === null ? (
            <span className="text-muted-foreground">{t('trips.drawer.inProgress')}</span>
          ) : (
            <bdi>{formatDate(record.endedAt, { style: 'day-month-time', language })}</bdi>
          )}
        </Row>
        {/* §8.3.1 — lateness exists only on a late trip. It is not a zero on
            every other one; legacy encodes it INSIDE the status string
            (`'Late +8'`), which is why it can neither be filtered nor
            translated. */}
        {record.latenessMinutes !== null && (
          <Row label={t('trips.status.late')}>
            <bdi>{t('trips.late.minutes', { count: record.latenessMinutes })}</bdi>
          </Row>
        )}
      </Group>

      {/* ── fare ─────────────────────────────────────────────────────── */}
      <Group title={t('trips.drawer.fare')}>
        <Row label={t('trips.drawer.totalFare')} strong>
          <Money amount={record.fareHalalas} />
        </Row>
        <Row label={t('trips.drawer.driverEarnings')}>
          <Money amount={record.driverEarningsHalalas} />
        </Row>
        <Row label={t('trips.drawer.platformCut')}>
          <Money amount={record.platformCutHalalas} />
        </Row>
        {/* **The line whose absence broke the arithmetic.** Rendered
            unconditionally: `0` is a real zero here — no extra stop was made —
            and §8.3.1 keeps `—` for not-applicable, so hiding it would leave
            the reader to guess whether it was zero or unknown. */}
        <Row label={t('trips.drawer.extraStopFee')}>
          <Money amount={record.extraStopFeeHalalas} />
        </Row>
        <Row label={t('trips.drawer.tip')}>
          <Money amount={record.tipHalalas} />
        </Row>
        {residual !== 0 && (
          /* R5a — this is a standing condition on one record, so it is a
             sentence and not a red badge. It says the size of the gap, because
             `these do not reconcile` without the number is a fact an operator
             cannot act on. */
          <p role="status" className="pt-1 text-2xs text-muted-foreground">
            {t('trips.drawer.reconcileWarning', {
              amount: `${(residual / 100).toFixed(2)}`,
            })}
          </p>
        )}
      </Group>

      {/* ── quality ──────────────────────────────────────────────────── */}
      <Group title={t('trips.drawer.quality')}>
        <Row label={t('trips.col.rating')}>
          {record.driverRatingGiven === null ? (
            /* §8.3.1 — "nobody rated it" is a KNOWN fact, not an absent one, so
               it reads in words rather than as `—`. */
            <span className="text-muted-foreground">{t('trips.drawer.notRated')}</span>
          ) : (
            <bdi>{t('trips.rating.value', { rating: record.driverRatingGiven })}</bdi>
          )}
        </Row>
        {record.stateDesynced && (
          <p className="text-2xs text-muted-foreground">{t('trips.drawer.stateDesynced')}</p>
        )}
      </Group>

      {/* ── related records (P8-T1) ──────────────────────────────────── */}
      <Group title={t('trips.drawer.links')}>
        <Row label={t('trips.col.subscription')}>
          {record.subscriptionId === null ? (
            <span className="text-muted-foreground">{ABSENT}</span>
          ) : (
            <EntityLink
              href={hrefFor(record.subscriptionId)}
              code
              label={t('trips.open.subscription', { id: record.subscriptionId })}
              reason={t('trips.entity.unresolved')}
              reasonId="trip-drawer-sub-unresolved"
            >
              {record.subscriptionId}
            </EntityLink>
          )}
        </Row>
        <Row label={t('trips.col.payment')}>
          {record.paymentId === null ? (
            <span className="text-muted-foreground">{ABSENT}</span>
          ) : (
            <EntityLink
              href={hrefFor(record.paymentId)}
              code
              label={t('trips.open.subscription', { id: record.paymentId })}
              reason={t('trips.entity.unresolved')}
              reasonId="trip-drawer-payment-unresolved"
            >
              {record.paymentId}
            </EntityLink>
          )}
        </Row>
      </Group>
    </div>
  )
}

/* ───────────────────────────── the furniture ───────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <h3 className="border-b border-border pb-1 text-xs font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** A label and a value on one line. R4: the value takes the inline-END. */
function Row({
  label,
  strong = false,
  children,
}: {
  label: string
  strong?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? 'min-w-0 truncate text-end font-semibold tabular-nums text-foreground'
            : 'min-w-0 truncate text-end tabular-nums text-foreground'
        }
      >
        {children}
      </span>
    </div>
  )
}

/** A stacked label and value, for a place name that needs the full measure. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

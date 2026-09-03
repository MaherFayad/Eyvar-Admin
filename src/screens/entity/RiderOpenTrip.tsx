/**
 * **The open-trip card** — spec §6.5, §7.1, AC-RP-42 … AC-RP-49.
 *
 * ```
 *  ● Open right now
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │ حي حطين  →  مستشفى الملك فيصل التخصصي              0.00 SAR      │
 *  │ TRP-9104 · 25 Jun 09:11 · Requested                              │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │ No captain assigned yet                    [ Assign a captain ]  │
 *  └──────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## The four decisions in it
 *
 * **"Open" has one definition and it is the data layer's.**
 * `OPEN_TRIP_STATUSES` is the complement of the three terminal statuses, so it
 * cannot drift, and it is deliberately NOT `DispatchScreen`'s set: that one
 * plots trips a captain is committed to, and a `requested` trip has no captain
 * and no position to put on a map. `TRP-9104` is `requested`, which is why it
 * belongs here and not there (AC-RP-43).
 *
 * **The dot does not pulse** (AC-RP-45, X-14). R18 licences an ambient loop for
 * exactly one thing — *"this feed is live"* — and a single record card is not a
 * feed; misapplying that licence is legacy defect D24. It is a static filled
 * dot, `aria-hidden`, and the words `Open right now` carry the meaning (§7.5).
 *
 * **The route is three nodes, never a string** (§10.2, AC-RP-46). Built as
 * `origin + ' → ' + destination` the bidi algorithm resolves the neutral spaces
 * and the arrow against the paragraph and walks the three pieces apart. Two
 * `<bdi>` endpoints with the mirrored glyph between them in a flex row: DOM
 * order is logical order, the row reverses with the document, each endpoint
 * isolates itself. The accessible name is one key with two named params, never
 * a concatenation (§9.6).
 *
 * **`Assign a captain` navigates, and that is not a workaround.** There is no
 * client operation that assigns a captain to a `Trip` — `clients/trips.ts`
 * ships `setTripFlag` and nothing else, and `assignRequest` acts on a
 * `RideRequest`. Rather than ship a dead button or invent an operation, it opens
 * Live dispatch focused on this trip. Assignment needs a map and a captain
 * list; a profile has neither. It is also the one filled button on the page
 * (R3, AC-RP-47), and its target is the TRIP, which is why it lives on the trip
 * card and not in the page header (X-11).
 *
 * **§11.2's one refusal on this page.** Live dispatch is gated on
 * `view_operations`; an operator without it would be sent to a route that
 * refuses them. So the control renders **disabled in place with its reason as
 * real text**, `aria-describedby`-linked — never hidden, and never a tooltip
 * (§5.7 confines a tooltip to naming a control).
 *
 * **The card as a whole is not a click target** (AC-RP-49) — only its button
 * is, which is §9.1's rule for a row applied to a card.
 *
 * **It prints NO FARE, and the reference drawing's `0.00 SAR` is wrong.**
 * `Trip.fareHalalas` is `Halalas`, which is not nullable, so an unfinished trip
 * carries `0` because the field cannot be absent — not because the ride cost
 * nothing. Rendering it asserts a fare that has not been computed, which is the
 * same class of false statement as `98.00 SAR held` under a wallet balance
 * whose pending figure is zero. Dispatch reached the same conclusion on its own
 * card. The meta line beneath already says `Requested`, and that is the honest
 * content for the space.
 */

import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import type { Paginated, Trip } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { formatDate, mirrorGlyph } from '@/lib'
import type { Direction, Language, Translator } from '@/lib'
import { TRIP_STATUS } from '@/components/profile/domain'

export interface RiderOpenTripProps {
  /** The newest open trip, `pageSize: 1`; `total` is what `+n more open` names. */
  result: AsyncResult<Paginated<Trip>>
  /** `view_operations` — whether Live dispatch will accept this operator. */
  canOpenDispatch: boolean
  t: Translator
  language: Language
  dir: Direction
}

export function RiderOpenTrip({
  result,
  canOpenDispatch,
  t,
  language,
  dir,
}: RiderOpenTripProps) {
  const trip = result.data?.items[0] ?? null
  const more = Math.max((result.data?.total ?? 0) - 1, 0)

  return (
    <section className="flex flex-col gap-3">
      {/* X-4 / D18 — sentence case, no letter-spacing. X-13 — ONE string for
          this fact on both surfaces; the sheet's `LIVE · REQUESTED 09:11` is
          refused because the timestamp is already in the card's meta line. */}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-foreground" />
        {t('profile.rider.activity.open')}
      </p>

      {result.status === 'loading' && (
        /* §11.3 — shaped like the card it replaces. */
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
      )}

      {result.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('profile.state.error', { section: t('profile.rider.activity.open') })}
          action={{ label: t('profile.state.retry'), onClick: result.refetch }}
        />
      )}

      {result.status !== 'loading' && result.status !== 'error' && trip === null && (
        /* R8 — a card-scoped empty is ONE grey sentence. No illustration, no
           heading; the section's own eyebrow above already names it. */
        <EmptyState kind="no-match" card={false} message={t('entity.rider.trip.none')} />
      )}

      {trip !== null && (
        <>
          <article className="flex flex-col rounded-lg border border-border bg-muted">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5">
              {/* §10.2 — three nodes. The accessible name is the keyed sentence
                  so a screen reader is not read a bare arrow. */}
              <TripRoute trip={trip} t={t} dir={dir} />
            </div>

            <p className="px-3 pb-2.5 text-xs text-muted-foreground">
              <bdi>
                {t('entity.rider.trip.meta', {
                  id: trip.id,
                  date: formatDate(trip.startedAt, { style: 'day-month-time', language }),
                  status: t(TRIP_STATUS[trip.status].key),
                })}
              </bdi>
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
              <span className="text-sm text-foreground">
                {/* **The SHARED spelling, and the one whose TENSE fits a card
                    about a trip that has not finished.** Both live in
                    `i18n/vocabulary/copy.ts`, the module that exists so a
                    sentence the timeline already renders is not spelled a
                    second time on a card two inches away.
                    `rider.timeline.trip.noCaptain` is past tense — correct on a
                    timeline row reporting something that has happened, and
                    wrong here, where it would read as though the trip were
                    over. That is the one thing this card exists to say it is
                    not. The assigned case is the sheet's. Neither is minted. */}
                {trip.driverName === null
                  ? t('rider.trip.noCaptainYet')
                  : t('profile.rider.activity.captainOnBoard')}
              </span>
              <AssignControl trip={trip} canOpenDispatch={canOpenDispatch} t={t} />
            </div>
          </article>

          {more > 0 && (
            <p className="text-xs text-muted-foreground">
              <bdi>
                {t.plural('entity.rider.trip.moreOpen', { count: more })}
              </bdi>
            </p>
          )}
        </>
      )}
    </section>
  )
}

/**
 * **The route, built from `pickup` and `destination` and never from `route`.**
 *
 * `Trip.route` is a pre-joined display string holding a HARDCODED `→`
 * (`'King Fahd St → KFUPM'`, `types/trip.ts`). That glyph cannot mirror under
 * `dir="rtl"`, the two endpoints inside it cannot be isolated from each other,
 * and neither half can be translated. The two fields are right there and both
 * are nullable, so all three cases are handled:
 *
 *   both      two `<bdi>` endpoints with the mirrored glyph between them
 *   pickup    the origin alone, with the destination stated as unconfirmed
 *   neither   nothing — the meta line beneath still names the trip
 *
 * The accessible name is one key with two named params (§9.6), so a reader who
 * gets no glyphs is read a sentence rather than a bare arrow.
 */
function TripRoute({ trip, t, dir }: { trip: Trip; t: Translator; dir: Direction }) {
  const { pickup, destination } = trip

  if (pickup === null && destination === null) return null

  if (pickup === null || destination === null) {
    const only = pickup ?? destination
    return (
      <span className="min-w-0 truncate text-sm text-foreground">
        <bdi>{only}</bdi>
      </span>
    )
  }

  return (
    <span
      className="flex min-w-0 items-baseline gap-2 text-sm text-foreground"
      aria-label={t('entity.rider.trip.route', { origin: pickup, destination })}
    >
      <bdi className="truncate">{pickup}</bdi>
      {/* §9.5 — swapped at STRING-CONSTRUCTION time. Never a `scaleX(-1)`
          (AC-RP-15). It is decoration: the `aria-label` above carries the
          relation in words. */}
      <span aria-hidden="true" className="shrink-0 text-muted-foreground">
        {mirrorGlyph('→', dir)}
      </span>
      <bdi className="truncate">{destination}</bdi>
    </span>
  )
}

/**
 * R3's one filled button on this page, and §11.2's one refusal.
 *
 * Enabled it is a `<Link>` — a navigation, not a mutation, so middle-click and
 * open-in-new-tab work and the destination is in the status bar. Refused it is
 * a real disabled `<button>` with its sentence rendered beside it as text and
 * bound by `aria-describedby`, which is the construction `table/rowActions.tsx`
 * already settled for §11.2: *"a hover-only explanation is also unreachable by
 * keyboard and unreachable on touch."*
 */
function AssignControl({
  trip,
  canOpenDispatch,
  t,
}: {
  trip: Trip
  canOpenDispatch: boolean
  t: Translator
}) {
  const reasonId = useId()

  if (!canOpenDispatch) {
    return (
      <span className="flex flex-col items-end gap-1">
        <Button variant="default" disabled aria-describedby={reasonId}>
          {t('profile.rider.action.assign')}
        </Button>
        <span id={reasonId} className="text-xs text-muted-foreground">
          {t('entity.rider.refusal.assignPermission')}
        </span>
      </span>
    )
  }

  return (
    <Button variant="default" asChild>
      <Link to={`/operations/dispatch?trip=${trip.id}`}>{t('profile.rider.action.assign')}</Link>
    </Button>
  )
}

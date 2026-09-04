/**
 * **The ride page** — `/entity/TRP-*`, the full-screen record behind the ride
 * sheet's `Open full record`.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │ ← TRIP · TRP-7742                                                    │
 *  │ Al Malaz → Riyadh Park                          [Late] [Flagged]     │  BoardBand
 *  │ 25 Jun 07:45 │ Nora Al-Harbi │ Ahmed Salem                           │
 *  ├───────────────────────────────────────────────┬──────────────────────┤
 *  │                                               │  DISTANCE   14.6 km  │
 *  │                  the map, tall                │  ELAPSED      22 min │
 *  │                                               │  REMAINING    12 min │
 *  │                                               │  VS PLAN     +12 min │
 *  ├───────────────────────────────────────────────┤                      │
 *  │ ● Requested  ● Accepted  ◐ Arrived  ● Started │  PASSENGER           │
 *  │                                               │  CAPTAIN             │
 *  │ Fare                                          │                      │
 *  └───────────────────────────────────────────────┴──────────────────────┘
 * ```
 *
 * ## Same facts, different arrangement — and that is the whole contract
 *
 * `ProfileLayer`'s header states the rule this page obeys: two surfaces may
 * arrange one set of facts differently; **they may not hold two sets**. Every
 * block here is the component the sheet renders, given more room:
 *
 * | block | sheet | page |
 * |---|---|---|
 * | `TripMap`     | 224px, marks + endpoint card | 384px, the same marks |
 * | `TripFacts`   | a row list under the map | the rail's first card |
 * | `TripParties` | stacked | side by side in the rail |
 * | `TripStages`  | a vertical rail under a tab | a horizontal run across the measure |
 * | `TripFare`    | the other tab | its own block, always open |
 *
 * The one thing the page does that the sheet cannot is **show the stages and
 * the fare at once**. At 480px those are two tabs because a stage rail and a
 * five-line breakdown do not both fit above the fold; at page width they are
 * two blocks, and an operator answering *"why is this fare what it is"* reads
 * the detour and the extra-stop line without switching anything.
 *
 * Rules applied
 *   AC-14      the shell STAYS. This is a page inside the console, not a
 *              full-bleed editor.
 *   AC-34      the rail array IS the restack order below `--ev-bp-wide`: the
 *              figures first, then the two parties.
 *   §9.2 #14   each read owns its own states inside its own block; a failed
 *              stage log costs the rail and not the page.
 *   §9.1       nothing is placed on a physical side. The map canvas alone is
 *              pinned `dir="ltr"`, inside `TripMap`, where the geography is.
 */

import { useMemo } from 'react'
import type { AsyncResult } from '@/hooks'
import type { IsoDateTime, ProfileRef, Trip } from '@/data/types'
import { formatDate, type Direction, type Language, type Translator } from '@/lib'
import { BoardBand } from '@/components/metrics'
import { MonitorShell } from '@/components/PageShell'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import {
  TripFacts,
  TripFare,
  TripMap,
  TripParties,
  TripStages,
  TRIP_STATUS_TONE,
  hasTripMap,
  useTripReads,
} from '@/components/profile/trip'
import { ReturnControl } from './ReturnControl'

export interface TripProfilePageProps {
  entity: ProfileRef
  /** The record read, owned by `EntityPageScreen` so the page never fetches it twice. */
  trip: AsyncResult<Trip> & { data: Trip | null }
  backTo: string
  backLabel: string
  /** The clock every elapsed figure is measured against. Never `Date.now()`. */
  nowIso: IsoDateTime
  /** `?entity=` hrefs into the 360° layer, built by the caller. */
  hrefFor: (id: string | null) => string | null
  t: Translator
  language: Language
  dir: Direction
}

export function TripProfilePage({
  entity,
  trip,
  backTo,
  backLabel,
  nowIso,
  hrefFor,
  t,
  language,
  dir,
}: TripProfilePageProps) {
  const record = trip.data
  const reads = useTripReads(record, true)
  const telemetry = reads.telemetry.data ?? null

  const aside = useMemo(
    () =>
      record === null
        ? []
        : [
            <div
              key="facts"
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
            >
              <TripFacts
                trip={record}
                telemetry={telemetry}
                nowIso={nowIso}
                t={t}
                language={language}
              />
            </div>,
            <TripParties
              key="parties"
              trip={record}
              rider={reads.rider.data ?? null}
              captain={reads.captain.data ?? null}
              subscription={reads.subscription.data ?? null}
              riderHref={hrefFor(record.riderId)}
              captainHref={hrefFor(record.driverId)}
              subscriptionHref={hrefFor(record.subscriptionId)}
              t={t}
              language={language}
            />,
            /* **The fare moved out of the canvas and into the rail**, because
               the canvas is the map now. It is five lines and a sentence — the
               shape a 340px column is for — and it keeps the sheet's own
               arrangement, where the fare is a tab rather than a banner. */
            <div
              key="fare"
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
            >
              <TripFare trip={record} paymentHref={hrefFor(record.paymentId)} t={t} />
            </div>,
          ],
    [record, telemetry, nowIso, reads, hrefFor, t, language],
  )

  return (
    <MonitorShell
      header={
        <div className="flex flex-col gap-4 pb-5">
          <TripBandBlock
            entity={entity}
            trip={record}
            backTo={backTo}
            backLabel={backLabel}
            t={t}
            language={language}
            dir={dir}
          />
        </div>
      }
      canvas={
        record === null ? (
          /* The record is what every block is built from, so its failure is the
             canvas's. The band above still carries the id and the back
             control. */
          <ErrorState
            scope="card"
            message={t('profile.trip.state.error')}
            action={{ label: t('profile.trip.state.retry'), onClick: trip.refetch }}
          />
        ) : (
          /* A column with a declared floor, so the map has something to fill.
             `min-h-152` is `DispatchMap`'s figure — the one other surface in the
             product whose subject is the ground — and below the wide
             breakpoint the map falls back to its own `min-h-96`. */
          <div className="flex min-h-0 flex-col gap-4 wide:min-h-152">
            {hasTripMap(record) ? (
              /* **The map fills the canvas.** `flex-1` inside a column with a
                 declared floor, which is `DispatchMap`'s own arrangement — the
                 one other surface in the product whose subject IS the ground. */
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
                <TripMap
                  trip={record}
                  telemetry={telemetry}
                  height="page"
                  t={t}
                  language={language}
                />
              </div>
            ) : (
              /* **R8 — a missing picture is NAMED, never a blank.** The
                 gazetteer places ~30 Riyadh names and a ride between two it does
                 not know has no map; saying so is the difference between a
                 surface that is broken and one that is honest. */
              <p className="rounded-xl border border-border bg-muted px-4 py-3 text-xs text-muted-foreground">
                {t('profile.trip.map.none')}
              </p>
            )}

            {record.stateDesynced && (
              <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                {t('profile.trip.desynced')}
              </p>
            )}

            {/* Docked under the canvas, across its whole measure — the stage log
                is a timeline and a timeline wants width, which is the one thing
                the 340px rail beside it has not got. Its own four states are
                owned here, so a failed read costs the rail and not the page. */}
            {reads.telemetry.status === 'error' ? (
              <ErrorState
                scope="card"
                message={t('profile.trip.stages.error')}
                action={{
                  label: t('profile.trip.state.retry'),
                  onClick: reads.telemetry.refetch,
                }}
              />
            ) : (
              telemetry !== null && (
                <div className="shrink-0 rounded-xl border border-border bg-card p-4">
                  <TripStages
                    telemetry={telemetry}
                    layout="row"
                    t={t}
                    language={language}
                  />
                </div>
              )
            )}
          </div>
        )
      }
      /* AC-34 — the array IS the restack order below `--ev-bp-wide`: the
         figures first, then the two parties, then the money. */
      aside={aside}
    />
  )
}

/**
 * The page's band. `BoardBand` rather than the sheet's `TripBand`, because a
 * page has a back control and no close control and its title is the page's one
 * `<h1>` rather than a dialog's accessible name — the same split the rider page
 * already makes between `RiderBand` and `RiderBandBlock`.
 */
function TripBandBlock({
  entity,
  trip,
  backTo,
  backLabel,
  t,
  language,
  dir,
}: {
  entity: ProfileRef
  trip: Trip | null
  backTo: string
  backLabel: string
  t: Translator
  language: Language
  dir: Direction
}) {
  const meta: string[] = trip
    ? [
        formatDate(trip.startedAt, { style: 'day-month-time', language }),
        trip.riderName,
        trip.driverName,
      ].filter((value): value is string => value !== null && value !== '')
    : /* Before the record lands the band still says which ride this is, from
         the ref that resolved first. Nothing waits for the read (§9.2). */
      [entity.subtitle ?? ''].filter((value) => value !== '')

  const title = trip
    ? t('profile.trip.band.route', {
        pickup: trip.pickup ?? trip.route,
        destination: trip.destination ?? trip.route,
      })
    : entity.title

  return (
    <BoardBand shape="inset" density="bar">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ReturnControl to={backTo} label={backLabel} dir={dir} />
          <p className="flex items-center gap-1.5 text-2xs font-medium tracking-wider text-hero-label uppercase">
            <span>{t(`profile.kind.${entity.entityType}`)}</span>
            <span aria-hidden="true">·</span>
            <bdi className="tabular-nums">{entity.entityId}</bdi>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* The page's ONE `<h1>`, and it is the journey. It wraps and is never
              clamped: a long Arabic place name's second half is the part that
              disambiguates two districts with one stem. */}
          <h1 className="text-band font-medium break-words text-hero-foreground">
            <bdi>{title}</bdi>
          </h1>
          {trip && (
            <span className="flex flex-wrap items-center gap-1.5">
              {/* The trips table's own tones, read from the one map. Two
                  surfaces showing one trip in two colours is what a shared map
                  exists to prevent. */}
              <StatusBadge tone={TRIP_STATUS_TONE[trip.status]}>
                {t(`trips.status.${trip.status}`)}
              </StatusBadge>
              {trip.flagged && (
                <StatusBadge tone="warning">{t('profile.trip.band.flagged')}</StatusBadge>
              )}
            </span>
          )}
        </div>

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
      </div>
    </BoardBand>
  )
}

/**
 * **The four figures a running ride is judged by**, and the two a finished one
 * is.
 *
 * ```
 *  DISTANCE       14.6 km
 *  ELAPSED          22 min
 *  REMAINING        12 min
 *  AGAINST PLAN    +12 min      ← warning, and the only tone on the block
 * ```
 *
 * ## Why `Against plan` is stated rather than left to be worked out
 *
 * It is the question the whole sheet exists to answer. Legacy could say a trip
 * was `Late +8` and nothing else, so an operator comparing a projection to a
 * quote did the subtraction in their head from two numbers on opposite sides of
 * a screen. `types/tripTelemetry.ts` carries both operands —
 * `plannedDurationMinutes` and the projection behind `etaAt` — precisely so
 * this line can be computed once, here, and be the same number the stage rail's
 * deltas add up to.
 *
 * ## Every figure is derived from a passed clock
 *
 * `Elapsed` and `Remaining` are the difference between now and an instant on
 * the record, and `mock/clock.ts` states the rule this obeys: *"there is no
 * ambient time"*. The clock arrives as a prop from `useNowIso`, which is the
 * fixed `EYVAR_NOW` under the mock — a host clock would render every seeded
 * trip as having finished eight months ago.
 *
 * ## §8.3.1 — the finished trip loses two rows rather than showing two zeros
 *
 * A trip that ended has no *Remaining* and nothing to be *against plan* about;
 * it has a duration. Printing `0 min` for the first would be a claim that it is
 * about to arrive. The block renders `Distance` and `Duration` instead, which
 * is what the record actually knows.
 *
 * R5a: `Against plan` is `warning` when time was lost and muted otherwise.
 * **Nothing here is red** — a ride twelve minutes over is not an incident, and
 * the trips table makes the same call for the same reason.
 */

import type { IsoDateTime, Trip, TripTelemetry } from '@/data/types'
import { ABSENT, formatCount, formatDecimal, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

export interface TripFactsProps {
  trip: Trip
  telemetry: TripTelemetry | null
  /** The clock. Never `Date.now()` — see the module header. */
  nowIso: IsoDateTime
  t: Translate
  language: Language
  /** `'card'` floats over the map on a wide page; `'rows'` stacks in the sheet. */
  variant?: 'card' | 'rows'
}

interface Figure {
  label: string
  value: string
  /** The one tone the block may carry. R5a — `warning`, never red. */
  tone?: 'warning'
}

/**
 * Whole minutes between two instants, positive when `to` is after `from`.
 * Rounded rather than truncated: a trip 89 seconds in reads `1 min` under
 * truncation and `2 min` here, and the second is what a person would say.
 */
function minutesBetween(from: IsoDateTime, to: IsoDateTime): number {
  /* `Date.parse` and not a helper from `src/data`: every instant in the product
     carries an explicit `+03:00`, so parsing is not host-dependent, and a
     component reaching into the data layer for arithmetic would be the import
     direction `places.ts` records as forbidden one level up. */
  return Math.round((Date.parse(to) - Date.parse(from)) / 60_000)
}

export function tripFigures(
  trip: Trip,
  telemetry: TripTelemetry | null,
  nowIso: IsoDateTime,
  t: Translate,
  language: Language,
): Figure[] {
  const km =
    trip.distanceKm === null
      ? /* §8.3.1 — a cancelled trip has no distance, and `0` would be a lie
           legacy tells and then computes a platform cut from. */
        ABSENT
      : t('profile.trip.fact.km', { km: formatDecimal(trip.distanceKm, 1, language) })

  const figures: Figure[] = [{ label: t('profile.trip.fact.distance'), value: km }]

  const running = telemetry !== null && telemetry.etaAt !== null

  if (!running) {
    figures.push({
      label: t('profile.trip.fact.duration'),
      value:
        trip.durationMinutes === null
          ? ABSENT
          : t('profile.trip.fact.minutes', {
              minutes: formatCount(trip.durationMinutes, language),
            }),
    })
    return figures
  }

  const eta = telemetry.etaAt as IsoDateTime
  const elapsed = Math.max(0, minutesBetween(trip.startedAt, nowIso))
  const remaining = Math.max(0, minutesBetween(nowIso, eta))
  const projected = Math.max(0, minutesBetween(trip.startedAt, eta))
  const planned = telemetry.plannedDurationMinutes

  figures.push(
    {
      label: t('profile.trip.fact.elapsed'),
      value: t('profile.trip.fact.minutes', { minutes: formatCount(elapsed, language) }),
    },
    {
      label: t('profile.trip.fact.remaining'),
      value: t('profile.trip.fact.minutes', { minutes: formatCount(remaining, language) }),
    },
  )

  if (planned === null) {
    /* No quote to measure against. The row still renders — its absence would
       read as "on plan", which is a different and unearned claim. */
    figures.push({ label: t('profile.trip.fact.plan'), value: ABSENT })
    return figures
  }

  const delta = projected - planned
  figures.push({
    label: t('profile.trip.fact.plan'),
    value:
      delta === 0
        ? t('profile.trip.fact.onPlan')
        : delta > 0
          ? t('profile.trip.fact.over', { minutes: formatCount(delta, language) })
          : t('profile.trip.fact.under', { minutes: formatCount(-delta, language) }),
    tone: delta > 0 ? 'warning' : undefined,
  })

  return figures
}

export function TripFacts({
  trip,
  telemetry,
  nowIso,
  t,
  language,
  variant = 'rows',
}: TripFactsProps) {
  const figures = tripFigures(trip, telemetry, nowIso, t, language)

  return (
    <dl
      data-numeric
      className={cn(
        'flex flex-col gap-1 text-xs',
        variant === 'card' && 'rounded-lg border border-border bg-card/95 px-3 py-2',
      )}
    >
      {figures.map((figure) => (
        <div key={figure.label} className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">{figure.label}</dt>
          <dd
            className={cn(
              'text-end font-medium tabular-nums',
              figure.tone === 'warning' ? 'text-tone-warning-fg' : 'text-foreground',
            )}
          >
            <bdi>{figure.value}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  )
}

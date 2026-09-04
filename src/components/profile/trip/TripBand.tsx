/**
 * The ride sheet's head — the same deep-green field the rider and captain
 * sheets carry, over the one thing this record is about: **the journey**.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────────────────┬───┐
 *  │  TRIP · TRP-7742                                                 │ ✕ │  --color-hero-label
 *  │  Al Malaz → Riyadh Park                                          │   │  --text-band, hero-fg
 *  │  25 Jun 07:45 │ Nora Al-Harbi │ Ahmed Salem                      │   │  hero-muted
 *  │  Late  Flagged                                                   │   │  the badges
 *  └──────────────────────────────────────────────────────────────────┴───┘
 * ```
 *
 * ## Why the ROUTE is the title
 *
 * The same argument `RequestBand` makes one record along, and it is worth
 * stating again because the trips index made the opposite choice: its identity
 * cell is the trip **id**, which is correct for a table row — an operator scans
 * a column of ids. It is wrong for a record. `TRP-7742` names the row; *Al
 * Malaz → Riyadh Park* names the thing that happened, and the id is one line up
 * where it can still be copied and read down a phone.
 *
 * ## The badges are the one exception the band makes
 *
 * The rider band carries no status. This one carries the trip's, and `Flagged`
 * beside it when the record has been flagged — because a status here is not a
 * description of a record, it is **whether this ride still needs somebody**.
 *
 * R5a is untouched: `late` is `warning`, `cancelled` and `no-show` are neutral
 * and the WORD carries them, and `flagged` is `warning` too. **There is no red
 * badge on this surface**, which is the trips table's own standing ruling.
 *
 * Rules applied
 *   §6.2       ONE header. This replaces `ShellLayer`'s 48px chrome bar rather
 *              than sitting under it — `banner` and `header` are mutually
 *              exclusive by construction.
 *   tokens     `--color-hero*`, whose contrast is measured in `globals.css`.
 *              Never `--ev-brand`, which is a CONTROL fill measured at 32px.
 *   §7.2       the close control takes the band's own ring, because `--ring` is
 *              brand-green and brand-green on hero-green is not a visible ring.
 *   §9.1       the meta row is a flex row, so it reverses with the document;
 *              its separators are 1px spans rather than a border on one side.
 *   AC-73      the id and the date are `<bdi>`-isolated.
 *   §9.6       nothing is concatenated. The route is one key with two named
 *              placeholders, whose Arabic entry carries `←` — §9.5's rule that
 *              a mirroring glyph is swapped at string-construction time and
 *              never with CSS.
 */

import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge } from '@/components/StatusBadge'
import type { ProfileRef, Trip, TripStatus } from '@/data/types'
import { formatDate, type Language, type Translate } from '@/lib'

/**
 * R7 tones, keyed on the **union** so a ninth status cannot fall through to
 * `neutral` — the defect `TripsScreen` records having shipped, where a
 * `Record<string, …>` let four live statuses map to nothing.
 *
 * These are the trips table's tones, unchanged. Two surfaces showing one trip
 * in two colours is the thing a shared map exists to prevent.
 */
export const TRIP_STATUS_TONE: Readonly<
  Record<TripStatus, 'success' | 'warning' | 'info' | 'neutral' | 'new'>
> = {
  requested: 'info',
  assigned: 'new',
  'en-route': 'info',
  'in-trip': 'info',
  done: 'success',
  late: 'warning',
  cancelled: 'neutral',
  'no-show': 'neutral',
}

export interface TripBandProps {
  entity: ProfileRef
  /** `null` until the record arrives. The id does not wait for it. */
  trip: Trip | null
  t: Translate
  language: Language
}

export function TripBand({ entity, trip, t, language }: TripBandProps) {
  /* Built as data so the row can drop an absent fact without leaving an orphan
     separator — the separators are placed BETWEEN what survives, not beside
     what might not. A ride with no captain is the case that needs it. */
  const meta: string[] = trip
    ? [
        formatDate(trip.startedAt, { style: 'day-month-time', language }),
        trip.riderName,
        trip.driverName,
      ].filter((value): value is string => value !== null && value !== '')
    : [entity.subtitle ?? ''].filter((value) => value !== '')

  const title = trip
    ? t('profile.trip.band.route', {
        pickup: trip.pickup ?? trip.route,
        destination: trip.destination ?? trip.route,
      })
    : entity.title

  return (
    <div className="relative flex flex-col gap-2 bg-hero px-6 py-5 text-hero-foreground">
      <SheetClose asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute end-3 top-3 text-hero-foreground hover:bg-hero-2 hover:text-hero-foreground focus-visible:ring-hero-foreground focus-visible:ring-offset-hero"
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">{t('shell.layer.close')}</span>
        </Button>
      </SheetClose>

      {/* The eyebrow: what KIND of record, then WHICH one. Two independent
          labels rather than one interpolated string — the kind is a translated
          noun and the id is a Latin code, and gluing them would make one
          untranslatable run out of two correct ones (§9.6). */}
      <p className="flex items-center gap-1.5 pe-8 text-2xs font-medium tracking-widest text-hero-label uppercase">
        <span>{t(`profile.kind.${entity.entityType}`)}</span>
        <span aria-hidden="true">·</span>
        <bdi className="tabular-nums">{entity.entityId}</bdi>
      </p>

      {/* The one `Dialog.Title` on this surface. `ShellLayer` renders none when
          a banner is given, so this is the accessible name. */}
      <SheetTitle className="text-band font-medium break-words text-hero-foreground">
        {title}
      </SheetTitle>

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

      {trip && (
        <p className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={TRIP_STATUS_TONE[trip.status]}>
            {t(`trips.status.${trip.status}`)}
          </StatusBadge>
          {/* The field this screen's own row action WRITES. The trip drawer it
              replaces never showed it, so an operator could flag a ride, open
              it, and see no sign that they had. */}
          {trip.flagged && (
            <StatusBadge tone="warning">{t('profile.trip.band.flagged')}</StatusBadge>
          )}
        </p>
      )}
    </div>
  )
}

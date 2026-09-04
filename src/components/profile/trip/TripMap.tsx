/**
 * **The ride, on the ground it happened on** — the trip record's map.
 *
 * ```
 *  ┌──────────────────────────────────────────────────┐
 *  │                            ┌───────────────────┐ │
 *  │              ▪             │ DISTANCE  14.6 km │ │  floating, inline-end
 *  │            ╱               │ ELAPSED   22 min  │ │
 *  │          ◆  62 km/h        │ REMAINING 12 min  │ │
 *  │        ╱                   │ VS PLAN   +12 min │ │
 *  │      ●                     └───────────────────┘ │
 *  │                                           [+][−] │
 *  │ ┌──────────────────────────────────────────────┐ │
 *  │ │ ● PICKUP     Al Malaz          07:45         │ │  floating
 *  │ │ ◆ CAPTAIN    62 km/h                         │ │
 *  │ │ ▪ DROP-OFF   Riyadh Park       ETA 08:19     │ │
 *  │ └──────────────────────────────────────────────┘ │
 *  └──────────────────────────────────────────────────┘
 * ```
 *
 * It is `RequestMap`'s sibling and deliberately its copy where the two agree —
 * same gazetteer, same projection, same floor under the fit, same `dir="ltr"`
 * canvas, same rule that every fact on the picture is also text in the
 * document. Three things differ, and each difference is a claim:
 *
 *   1. **The connector is SOLID.** A request's leg is dashed because nobody has
 *      driven it; this one has been driven, or is being. That is the same
 *      distinction Live Dispatch draws between a pending request and a trip,
 *      and it is worth keeping identical across three surfaces.
 *   2. **There is a third mark — the captain.** It is a DIAMOND, so the three
 *      marks differ in shape and not only in colour (§7.5), and the card below
 *      repeats all three in words.
 *   3. **The captain's mark is labelled as an estimate, on the surface.**
 *      `types/tripTelemetry.ts` refuses to model a position it does not have
 *      and hands over `progress` instead — elapsed against the plan. So the
 *      mark is placed by interpolating the connector, and the caption says so
 *      in the operator's own words rather than in a code comment. A mark that
 *      looks like a GPS fix and is not will otherwise be read as one, and an
 *      operator will ring a captain about a road they were never on.
 *
 * A place the gazetteer cannot resolve is **not drawn and is named**. With
 * neither end placeable there is no map at all — `hasTripMap` is what the
 * callers ask before they decide the layout, so there is exactly one answer to
 * *"is there a picture here"*.
 *
 * Rules applied
 *   §9.1        the canvas is pinned `dir="ltr"` and ONLY the canvas — north is
 *               up and east is right of west in every locale. The chrome around
 *               it follows the document.
 *   §7.5        shape carries the reading; colour is the second signal.
 *   §11.3       no spinner. Tiles fade in as they land.
 *   R18         nothing pulses or loops. The captain's mark moves when the
 *               record is re-read, which is a re-render and not an animation.
 *   AC-30       zoom is reachable from the keyboard through two real buttons.
 *   a11y        the SVG is the labelled picture (`role="img"` + `<desc>`); the
 *               basemap under it is `aria-hidden`. Every floating figure is real
 *               text, so nothing here exists only as a picture.
 */

import {
  Basemap,
  BasemapAttribution,
  fitProjection,
  locate,
  MapZoomControls,
  VIEW_W,
  useMapViewport,
  type GeoPoint,
} from '@/components/map'
import type { Trip, TripTelemetry } from '@/data/types'
import { formatDecimal, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

/**
 * The smallest window the fit will draw, in degrees. About 2.2km at Riyadh's
 * latitude — see `RequestMap`, which states the same floor for the same reason:
 * two district anchors in adjacent neighbourhoods sit ~0.01° apart and fitting
 * exactly that leaves an operator looking at a junction rather than at a city.
 */
const MIN_SPAN_DEG = 0.02

/** Breathing room between a mark and the frame, in view units. */
const PAD = 22

/** Mean Earth radius in kilometres — the straight-line figure's one constant. */
const EARTH_KM = 6371

export interface TripMapProps {
  trip: Trip
  telemetry: TripTelemetry | null
  /** Fitted height. The sheet gives it less than the page does. */
  height?: 'sheet' | 'page'
  t: Translate
  language: Language
}

/**
 * The two endpoints, resolved once. Exported because the callers decide their
 * layout on whether there is a map at all, and a second `locate` call in those
 * files would be a second chance for the two to disagree about what is
 * placeable.
 */
export function tripPoints(trip: Trip): { from: GeoPoint | null; to: GeoPoint | null } {
  return { from: locate(trip.pickup), to: locate(trip.destination) }
}

/** Whether there is a picture to draw. One end placed is enough for a map. */
export function hasTripMap(trip: Trip): boolean {
  const { from, to } = tripPoints(trip)
  return from !== null || to !== null
}

/** Great-circle kilometres between two anchors. See the header on what it is not. */
function straightLineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The window to fit: the ride's own extent, widened to `MIN_SPAN_DEG` about its
 * centre when the two ends are close together or there is only one of them.
 */
function frameFor(points: readonly GeoPoint[]): readonly GeoPoint[] {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const halfLat = Math.max((Math.max(...lats) - Math.min(...lats)) / 2, MIN_SPAN_DEG / 2)
  const halfLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) / 2, MIN_SPAN_DEG / 2)
  return [
    { lat: midLat - halfLat, lng: midLng - halfLng },
    { lat: midLat + halfLat, lng: midLng + halfLng },
  ]
}

/**
 * Where the captain is drawn: `progress` of the way along the connector.
 *
 * `null` unless the trip is in flight AND both ends are placeable — a fraction
 * of a line with only one end is not a place, and drawing the mark on the one
 * anchor we do have would put the captain at a district they may be nowhere
 * near.
 */
function captainAt(
  from: GeoPoint | null,
  to: GeoPoint | null,
  progress: number | null,
): GeoPoint | null {
  if (from === null || to === null || progress === null) return null
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  }
}

export function TripMap({ trip, telemetry, height = 'sheet', t, language }: TripMapProps) {
  const { boxRef, viewH, view, panning, zoomAt, canZoomIn, canZoomOut, surfaceProps } =
    useMapViewport()

  const { from, to } = tripPoints(trip)
  const captain = captainAt(from, to, telemetry?.progress ?? null)

  const placed = [from, to].filter((point): point is GeoPoint => point !== null)
  const projection = fitProjection(placed, {
    viewH,
    pad: PAD,
    view,
    bounds: frameFor(placed),
  })

  const a = from === null ? null : projection.point(from.lat, from.lng)
  const b = to === null ? null : projection.point(to.lat, to.lng)
  const c = captain === null ? null : projection.point(captain.lat, captain.lng)

  const describedBy = `trip-map-${trip.id}`
  const pickup = trip.pickup ?? trip.route
  const destination = trip.destination ?? trip.route

  const unplaced = [
    from === null ? pickup : null,
    to === null ? destination : null,
  ].filter((place): place is string => place !== null)

  return (
    <section aria-labelledby={`${describedBy}-heading`} className="flex flex-col">
      <h3 id={`${describedBy}-heading`} className="sr-only">
        {t('profile.trip.map.heading')}
      </h3>

      <div
        ref={boxRef}
        /* **`dir="ltr"` is the map canvas, and only the map canvas.** The
           chrome around it mirrors; the geography never does. */
        dir="ltr"
        {...surfaceProps}
        className={cn(
          /* `touch-none` so a drag on a phone pans the map instead of scrolling
             the sheet out from under it; the two zoom buttons are the touch
             route in, because a pinch would fight the same gesture. */
          'relative w-full touch-none overflow-hidden border-b border-border bg-muted select-none',
          height === 'page' ? 'h-96' : 'h-56',
          view.k > 1 || panning ? (panning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
        )}
      >
        <Basemap viewW={VIEW_W} viewH={viewH} projection={projection.params} />

        <svg
          viewBox={`0 0 ${VIEW_W} ${viewH}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={`${describedBy}-desc`}
          className="absolute inset-0 size-full"
        >
          <desc id={`${describedBy}-desc`}>
            {t(c === null ? 'profile.trip.map.a11y' : 'profile.trip.map.a11yLive', {
              pickup,
              destination,
            })}
          </desc>

          {a && b && (
            <>
              {/* **Solid: this leg has been driven.** The difference from the
                  request sheet's dashed connector is the difference between a
                  plan and a journey, and Live Dispatch draws the same pair. */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--foreground)"
                strokeWidth={1.2}
                strokeOpacity={0.35}
                strokeLinecap="round"
              />
              {/* The part already covered, drawn over the whole leg. Two
                  strokes rather than two segments so the remaining leg keeps
                  its full length under the mark and the join does not show. */}
              {c && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={c.x}
                  y2={c.y}
                  stroke="var(--chart-series)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              )}
            </>
          )}

          {b && (
            /* §7.5 — the drop-off is a SQUARE. Two ends of one route are not
               good and bad, so they differ in shape rather than in colour, and
               the pair reads in greyscale. */
            <rect
              x={b.x - 2.6}
              y={b.y - 2.6}
              width={5.2}
              height={5.2}
              fill="var(--foreground)"
              stroke="var(--card)"
              strokeWidth={1.2}
            />
          )}

          {a && (
            <circle
              cx={a.x}
              cy={a.y}
              r={3.4}
              fill="var(--chart-series)"
              stroke="var(--card)"
              strokeWidth={1.2}
            />
          )}

          {c && (
            /* The third shape — a diamond, drawn as a rotated square about its
               own centre. Last, so it sits over the connector it is on. */
            <rect
              x={c.x - 2.8}
              y={c.y - 2.8}
              width={5.6}
              height={5.6}
              transform={`rotate(45 ${c.x} ${c.y})`}
              fill="var(--tone-warning-graphic)"
              stroke="var(--card)"
              strokeWidth={1.2}
            />
          )}
        </svg>

        {/* **The floating layer.** `pointer-events-none` throughout: nothing on
            it is interactive, and a transparent box over a map is a box the map
            cannot be dragged through. The zoom controls take their own events. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2 p-2">
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card/95 px-3 py-2">
            <Endpoint
              mark="pickup"
              label={t('profile.trip.map.pickup')}
              place={pickup}
              placed={from !== null}
            />
            {telemetry?.speedKmh !== null && telemetry !== null && (
              <Endpoint
                mark="captain"
                label={t('profile.trip.map.captain')}
                place={t('profile.trip.fact.speed', {
                  speed: formatDecimal(telemetry.speedKmh ?? 0, 0, language),
                })}
                placed={c !== null}
              />
            )}
            <Endpoint
              mark="destination"
              label={t('profile.trip.map.destination')}
              place={destination}
              placed={to !== null}
            />
          </div>
        </div>

        <MapZoomControls
          zoomAt={zoomAt}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          zoomInLabel={t('profile.trip.map.zoom.in')}
          zoomOutLabel={t('profile.trip.map.zoom.out')}
          side="end"
        />
      </div>

      {/* Under the map, not on it: the bottom edge is spent on the three marks,
          and a licence notice competing with them would be read as part of the
          ride. It is a real link either way — a licence a screen reader cannot
          reach is not a licence notice. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-muted px-4 py-2 text-2xs text-muted-foreground">
        <span className="flex min-w-0 flex-col">
          {from && to ? (
            <bdi>
              {t('profile.trip.map.straightLine', {
                distance: formatDecimal(straightLineKm(from, to), 1, language),
              })}
            </bdi>
          ) : (
            unplaced.map((place) => (
              <bdi key={place}>{t('profile.trip.map.unplaced', { place })}</bdi>
            ))
          )}
          {/* The caveat is on the surface, not only in this file's header. */}
          {c !== null && <span>{t('profile.trip.map.estimated')}</span>}
        </span>
        <BasemapAttribution />
      </div>
    </section>
  )
}

/**
 * One mark, as a row: the shape that identifies it on the canvas above, its
 * role, and what it is.
 *
 * The mark is `aria-hidden` — it is the picture's key, and the row already says
 * `Pickup` in words. A place the gazetteer could not resolve renders its mark
 * hollow, so the row and the canvas agree about what is drawn.
 */
function Endpoint({
  mark,
  label,
  place,
  placed,
}: {
  mark: 'pickup' | 'captain' | 'destination'
  label: string
  place: string
  placed: boolean
}) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-xs">
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 shrink-0 border',
          mark === 'pickup' && 'rounded-full border-chart-series',
          mark === 'captain' && 'rotate-45 border-tone-warning-graphic',
          mark === 'destination' && 'border-foreground',
          placed &&
            (mark === 'pickup'
              ? 'bg-chart-series'
              : mark === 'captain'
                ? 'bg-tone-warning-graphic'
                : 'bg-foreground'),
        )}
      />
      <span className="shrink-0 text-2xs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <bdi className="min-w-0 truncate text-foreground">{place}</bdi>
    </p>
  )
}

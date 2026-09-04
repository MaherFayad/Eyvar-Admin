/**
 * **The ride, on the ground it happens on** — the request sheet's map.
 *
 * ```
 *  ┌──────────────────────────────────────────────────┐
 *  │ ┌───────────┐                    ┌─────────────┐ │
 *  │ │ WAITING   │                    │ EST. FARE   │ │  floating, both ends
 *  │ │ 5m        │        ▪           │ 89.40 SAR   │ │
 *  │ │ overdue 2m│      ╱             └─────────────┘ │
 *  │ └───────────┘    ╱                               │
 *  │                ●                          [+][−] │
 *  │ ┌──────────────────────────────────────────────┐ │
 *  │ │ ● PICKUP        KAFD                         │ │  floating
 *  │ │ ▪ DROP-OFF      Airport T5                   │ │
 *  │ └──────────────────────────────────────────────┘ │
 *  └──────────────────────────────────────────────────┘
 * ```
 *
 * ## What each mark actually claims
 *
 * `components/map/places.ts` states the standing caveat and this surface
 * inherits every word of it: the two points are **hand-placed district
 * anchors**, not survey data and not telemetry, and the line between them is a
 * connector rather than a route. A `RideRequest` carries two place NAMES and no
 * geometry at all, so:
 *
 *   - the connector is **dashed**, and that is the same distinction Live
 *     Dispatch draws — a solid line is a journey, a dashed one is a plan. This
 *     ride has not been driven; on most of these rows nobody has even accepted
 *     it.
 *   - the two ends differ in **shape** as well as position — a disc and a
 *     square (§7.5) — so the picture survives greyscale and a colour-blind
 *     operator, and the floating card below repeats both in words.
 *   - the figure under the map says `straight line`, never `distance`. A number
 *     called `Distance` sitting a few pixels from a fare is one an operator will
 *     price against, and this one is the crow-flies gap between two anchors.
 *
 * A place the gazetteer has no entry for is **not drawn and is named**: the
 * caption says which end could not be placed, because a place missing from a
 * picture and a place missing from the data look identical once you stop saying
 * which it is. With neither end placeable there is no map — see `hasMap` in
 * `RequestProfile`, which is what decides whether this component renders at all.
 *
 * ## Why it fits the ride rather than the city
 *
 * Live Dispatch fits `MAP_BOUNDS`, a declared frame, because its pins move and
 * a board that re-frames itself drags Riyadh under the operator's cursor. This
 * sheet is about **one** ride that does not move, so the fit is the ride's own
 * extent — which is what makes a 3km hop legible instead of two dots in the
 * middle of a city. `MIN_SPAN_DEG` is the floor under that: two anchors in
 * neighbouring districts are ~0.01° apart and fitting them exactly would zoom
 * past the point where any street around them is recognisable.
 *
 * Rules applied
 *   §9.1        the canvas is pinned `dir="ltr"` and ONLY the canvas — north is
 *               up and east is right of west in every locale. The chrome around
 *               it, including which corner each floating card sits in, follows
 *               the document.
 *   §7.5        shape carries the reading; colour is the second signal.
 *   §11.3       no spinner. Tiles fade in as they land; a map still fetching its
 *               context is a map with less context, not a map in a loading
 *               state.
 *   R18         nothing pulses, blinks or loops. The waiting figure changes when
 *               the shell's clock ticks, which is a re-render, not an animation.
 *   AC-30       zoom is reachable from the keyboard through two real buttons.
 *   a11y        the SVG is the labelled picture (`role="img"` + `<desc>`); the
 *               basemap under it is `aria-hidden` because street tiles announce
 *               nothing a screen reader can use. Every floating card is real
 *               text in the document, so none of the facts on this map exist
 *               only as a picture.
 */

import { useState } from 'react'
import {
  Basemap,
  BasemapAttribution,
  fitProjection,
  locate,
  MapDialog,
  MapExpandButton,
  MapZoomControls,
  routeFrame,
  straightLineKm,
  VIEW_W,
  useMapViewport,
  type GeoPoint,
} from '@/components/map'
import { Money } from '@/components/Money'
import type { RideRequest } from '@/data/types'
import { formatDecimal, formatDuration, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

/** Breathing room between a mark and the usable frame, in view units. Tighter
    than the board default: this canvas is a third of a zone map's height and
    the pad is charged twice against it. */
const PAD = 14

/**
 * **What the floating cards cover, in CSS pixels, at each end of the canvas.**
 *
 * Measured from what they actually are: the figures row is a two-line card in
 * `p-2` (≈56px + 8), and the endpoint card is two `text-xs` rows in the same
 * inset (≈46px + 8). A mark drawn under the card that names it is the one
 * arrangement worse than not drawing it, so the fit gives both ends back.
 *
 * They are converted to view units against the measured box rather than
 * hard-coded, because `viewH` follows the box's own ratio — a fixed number of
 * view units would cover a different number of pixels on a phone than in a
 * drawer.
 */
const COVER_TOP_PX = 64
const COVER_BOTTOM_PX = 54

export interface RequestMapProps {
  request: RideRequest
  /** The pickup, or `null` when the gazetteer has no entry for its name. */
  from: GeoPoint | null
  to: GeoPoint | null
  /**
   * How long the rider has been waiting, in milliseconds, and whether that
   * clock is still running. Computed once in `RequestProfile` because the rail
   * states the same elapsed time in words and the two must not disagree by a
   * tick.
   */
  waitMs: number
  waitOpen: boolean
  /** The deadline's own state, in the words the queue row already uses. */
  slaLabel: string | null
  slaBreached: boolean
  /**
   * **`'expanded'` is this same component, inside `MapDialog`, drawing itself
   * again at viewport size.**
   *
   * One prop rather than a second component: the expanded map has to be the
   * same marks under the same projection, and a picture assembled twice is a
   * picture that can drift. See `components/map/MapDialog.tsx`, which owns the
   * chrome all three journey maps open into.
   */
  variant?: 'inline' | 'expanded'
  t: Translate
  language: Language
}

/**
 * The two endpoint names, resolved once. Exported because `RequestProfile`
 * needs to know whether there is a map to draw before it decides the layout,
 * and a second `locate` call in that file would be a second chance for the two
 * to disagree about what is placeable.
 */
export function requestPoints(request: RideRequest): { from: GeoPoint | null; to: GeoPoint | null } {
  return { from: locate(request.pickup), to: locate(request.destination) }
}

export function RequestMap({
  request,
  from,
  to,
  waitMs,
  waitOpen,
  slaLabel,
  slaBreached,
  variant = 'inline',
  t,
  language,
}: RequestMapProps) {
  const {
    boxRef,
    boxPx,
    viewH,
    view,
    panning,
    zoomAt,
    canZoomIn,
    canZoomOut,
    surfaceProps,
    lastGestureMoved,
  } = useMapViewport()
  const [expanded, setExpanded] = useState(false)
  const isInline = variant === 'inline'

  const placed = [from, to].filter((point): point is GeoPoint => point !== null)
  /* The cards' cover, in view units. `boxPx.h` is the measured height, so this
     tracks the box rather than assuming the `h-56` it is given today. */
  const perPx = boxPx.h > 0 ? viewH / boxPx.h : 0
  const projection = fitProjection(placed, {
    viewH,
    pad: PAD,
    view,
    reserveTop: COVER_TOP_PX * perPx,
    reserveBottom: COVER_BOTTOM_PX * perPx,
    bounds: routeFrame(placed),
  })

  const a = from === null ? null : projection.point(from.lat, from.lng)
  const b = to === null ? null : projection.point(to.lat, to.lng)

  const describedBy = `request-map-${request.id}`

  const unplaced = [
    from === null ? request.pickup : null,
    to === null ? request.destination : null,
  ].filter((place): place is string => place !== null)

  return (
    <section
      aria-labelledby={`${describedBy}-heading`}
      className={cn('flex flex-col', !isInline && 'h-full')}
    >
      <h3 id={`${describedBy}-heading`} className="sr-only">
        {t('profile.request.map.heading')}
      </h3>

      <div
        ref={boxRef}
        /* **`dir="ltr"` is the map canvas, and only the map canvas.** The
           chrome around it mirrors; the geography never does. */
        dir="ltr"
        {...surfaceProps}
        /**
         * **Click the map to open it — and a pan is not a click.**
         *
         * The browser fires `click` at the end of every drag, so a pan of two
         * hundred pixels would open the dialog the operator was trying to avoid
         * needing. `lastGestureMoved` is the hook's own answer; the second guard
         * keeps the zoom buttons and the attribution link doing their own jobs.
         *
         * A MOUSE convenience. The keyboard's way in is `MapExpandButton`.
         */
        onClick={
          isInline
            ? (event) => {
                if (lastGestureMoved()) return
                if ((event.target as HTMLElement).closest('button, a')) return
                setExpanded(true)
              }
            : undefined
        }
        className={cn(
          /* `touch-none` so a drag on a phone pans the map instead of scrolling
             the sheet out from under it; the two zoom buttons are the touch
             route in, because a pinch would fight the same gesture. */
          'relative w-full touch-none overflow-hidden bg-muted select-none',
          isInline
            ? 'h-64 border-b border-border'
            : 'h-full rounded-lg border border-border',
          view.k > 1 || panning ? (panning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
          isInline && view.k === 1 && !panning && 'cursor-zoom-in',
        )}
      >
        {/* Real OpenStreetMap tiles, in the same Web Mercator projection the
            marks are fitted in. The only thing here that can fail, and it
            removes itself after three unreachable tiles — a map with no
            streets, never a map with holes in it. */}
        <Basemap viewW={VIEW_W} viewH={viewH} projection={projection.params} />

        <svg
          viewBox={`0 0 ${VIEW_W} ${viewH}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={`${describedBy}-desc`}
          className="absolute inset-0 size-full"
        >
          <desc id={`${describedBy}-desc`}>
            {t('profile.request.map.a11y', {
              pickup: request.pickup,
              destination: request.destination,
            })}
          </desc>

          {a && b && (
            /* Dashed: the leg is not being driven. The difference from a trip's
               solid line is the difference between a plan and a journey. */
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--foreground)"
              strokeWidth={1.2}
              strokeOpacity={0.55}
              strokeDasharray="3 2.5"
              strokeLinecap="round"
            />
          )}

          {b && (
            /* §7.5 — the destination is a SQUARE. Two ends of one route are not
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
        </svg>

        {/* **The floating layer.** `pointer-events-none` throughout: nothing on
            it is interactive, and a transparent box over a map is a box the map
            cannot be dragged through. The zoom controls are outside it and take
            their own events. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex flex-col justify-between gap-2 p-2',
            /* **Shrink-wrapped when expanded.** In the 480px sheet a full-width card is
             the whole measure and reads as a caption; stretched across a
             1,500px dialog it is a banner with three words in it. `items-start`
             lets the cards take their content's width instead. */
          !isInline && 'items-start',
          )}
        >
          <RequestFigures
            request={request}
            waitMs={waitMs}
            waitOpen={waitOpen}
            slaLabel={slaLabel}
            slaBreached={slaBreached}
            t={t}
          />

          {/* The two ends, in words, on the map. This is what stops the picture
              being the only carrier: an operator who cannot read the marks —
              or cannot see them at all — still has the pair as text, in the
              same place, at the same moment. */}
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card/95 px-3 py-2">
            <Endpoint
              mark="pickup"
              label={t('profile.request.map.pickup')}
              place={request.pickup}
              placed={from !== null}
            />
            <Endpoint
              mark="destination"
              label={t('profile.request.map.destination')}
              place={request.destination}
              placed={to !== null}
            />
          </div>
        </div>

        {isInline && (
          <MapExpandButton
            label={t('profile.request.map.expand')}
            onClick={() => setExpanded(true)}
          />
        )}

        <MapZoomControls
          zoomAt={zoomAt}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          zoomInLabel={t('profile.request.map.zoom.in')}
          zoomOutLabel={t('profile.request.map.zoom.out')}
          side="end"
        />
      </div>

      {/* Under the map, not on it: the bottom edge is already spent on the two
          endpoints, and a licence notice competing with them would be read as
          part of the ride. It is a real link either way — a licence a screen
          reader cannot reach is not a licence notice. */}
      {isInline && (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-muted px-4 py-2 text-2xs text-muted-foreground">
        <span>
          {from && to ? (
            <bdi>
              {t('profile.request.map.straightLine', {
                distance: formatDecimal(straightLineKm(from, to), 1, language),
              })}
            </bdi>
          ) : (
            unplaced.map((place) => (
              <bdi key={place} className="block">
                {t('profile.request.map.unplaced', { place })}
              </bdi>
            ))
          )}
        </span>
        <BasemapAttribution />
      </div>
      )}

      {/* The same component, again, at viewport size. Mounted only while open,
          so the expanded instance starts at the fit every time rather than
          resuming a pan from an hour ago. */}
      {isInline && expanded && (
        <MapDialog
          open
          onOpenChange={setExpanded}
          title={t('requests.route', {
            pickup: request.pickup,
            destination: request.destination,
          })}
          description={t('profile.request.map.dialogNote')}
        >
          <RequestMap
            request={request}
            from={from}
            to={to}
            waitMs={waitMs}
            waitOpen={waitOpen}
            slaLabel={slaLabel}
            slaBreached={slaBreached}
            variant="expanded"
            t={t}
            language={language}
          />
        </MapDialog>
      )}
    </section>
  )
}

/**
 * **The two numbers an operator opens this sheet for**: how long the rider has
 * been waiting, and what the ride is worth.
 *
 * Exported and separate from the map because a request whose place names the
 * gazetteer does not know has **no map** — and losing the picture must not also
 * lose the two figures. `RequestProfile`'s no-map branch renders exactly this
 * row on the rail's own ground, so the sheet answers the same two questions
 * either way; only the ground under them changes.
 *
 * Both cards carry their own surface (`bg-card`), which is what makes them
 * legible over street tiles: a figure read against a road is not read at all.
 */
export function RequestFigures({
  request,
  waitMs,
  waitOpen,
  slaLabel,
  slaBreached,
  t,
}: {
  request: RideRequest
  waitMs: number
  waitOpen: boolean
  slaLabel: string | null
  slaBreached: boolean
  t: Translate
}) {
  const isSubscription = request.channel === 'subscription'
  const amount = isSubscription ? request.authorisationHoldHalalas : request.quotedFareHalalas

  return (
    <div className="flex items-start justify-between gap-2">
      <FloatCard
        label={t(waitOpen ? 'profile.request.float.waiting' : 'profile.request.float.waited')}
      >
        {/* `precision: 'second'` — the instant channel promises **three
            minutes** (`REQUEST_SLA_MINUTES`), and a figure that reads `1m` for
            the whole first minute of a three-minute promise is a figure an
            operator cannot act on. `formatDuration` drops to seconds only under
            a minute, so a subscription request's two-hour window still reads in
            hours and minutes. */}
        <span className="text-xl font-medium tabular-nums text-foreground">
          <bdi>{formatDuration(waitMs, { precision: 'second' })}</bdi>
        </span>
        {slaLabel !== null && (
          /* The deadline's own state, in the words the queue row uses. Warning
             ink and never red: R5a spends red on the row marker, and this sheet
             already has the status badge in its band. */
          <span
            className={cn(
              'text-2xs',
              slaBreached ? 'text-tone-warning-fg' : 'text-muted-foreground',
            )}
          >
            <bdi>{slaLabel}</bdi>
          </span>
        )}
      </FloatCard>

      {/* Absent rather than zero when no quote came back — §3.5. The rail
          carries the block that says so in words; a card here reading
          `0.00 SAR` would be a different and false claim. */}
      {amount !== null && (
        <FloatCard
          label={t(isSubscription ? 'profile.request.rail.hold' : 'profile.request.rail.fare')}
          align="end"
        >
          <span className="flex items-baseline gap-1">
            <Money amount={amount} unit="none" className="text-xl font-medium" />
            <span className="text-2xs text-muted-foreground">
              {t('profile.request.rail.unit')}
            </span>
          </span>
        </FloatCard>
      )}
    </div>
  )
}

/**
 * One floating card. Small, quiet, and on its own ground — a figure read
 * against a street is not read at all.
 */
function FloatCard({
  label,
  align = 'start',
  children,
}: {
  label: string
  align?: 'start' | 'end'
  children: React.ReactNode
}) {
  return (
    <div
      data-numeric
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-lg border border-border bg-card/95 px-3 py-2',
        align === 'end' ? 'items-end text-end' : 'items-start',
      )}
    >
      <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

/**
 * One end of the ride, as a row: the mark that identifies it on the canvas
 * above, its role, and the place.
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
  mark: 'pickup' | 'destination'
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
          mark === 'pickup' ? 'rounded-full border-chart-series' : 'border-foreground',
          placed && (mark === 'pickup' ? 'bg-chart-series' : 'bg-foreground'),
        )}
      />
      <span className="shrink-0 text-2xs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <bdi className="min-w-0 truncate text-foreground">{place}</bdi>
    </p>
  )
}

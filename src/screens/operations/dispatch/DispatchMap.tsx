/**
 * **The Live Dispatch canvas — the city, with the board's rows on it.**
 *
 * It is `components/map`'s surface (`Basemap` over `fitProjection`, the shared
 * pan-and-zoom viewport, the shared zoom controls) with three layers drawn on
 * top: trips in flight, requests waiting for a captain, and captains online.
 * Nothing about the projection or the tiles is re-derived here — Market & Zones
 * draws the same city and the two must not disagree about where a district is.
 *
 * ## The three layers, and what each mark actually claims
 *
 * A monitor that draws a mark it cannot justify is worse than one that draws
 * nothing, so each is labelled as the thing it is rather than the thing a
 * dispatch board wishes it had (`geo.ts` states what the API still owes us):
 *
 *   **Trip pickup** — a filled disc at the trip's pickup district. NOT the
 *   captain's live position, which no field on `Trip` carries.
 *   **Trip destination** — a square, joined to the pickup by a straight
 *   connector. A straight line between two districts is not the road anybody
 *   drove, so the legend says pickup and destination and never "route".
 *   **Request waiting** — an amber ring at the pickup, with a dashed connector
 *   to where the rider asked to go.
 *   **Captain online** — a green dot, placed from the captain's registered
 *   district (`captainPoint`). The word is `online`, never `live`.
 *
 * ## Why the frame is declared rather than fitted to the pins
 *
 * `MAP_BOUNDS`. A board whose extent is derived from its own rows re-frames the
 * whole city every time one row changes — dispatch a request and Riyadh jumps
 * under the operator's cursor. The ground is fixed and the pins move on it.
 *
 * Rules applied
 *   §7.4 / R6   a mark an operator can act on is a real `<button>`, never an
 *               SVG node with a click handler. The ten pickup marks are
 *               buttons; the captain dots and the connectors are decoration,
 *               and the fleet they stand for is a real list in the feed panel.
 *   §7.5        every layer differs in SHAPE as well as colour — disc, square,
 *               ring, dot — so the board survives greyscale and a colour-blind
 *               operator. Colour is the second signal, not the only one.
 *   §9.1        the canvas is pinned `dir="ltr"` and only the canvas: north is
 *               up and east is inline-end of west in every locale (`rtl.md`),
 *               while the panels floating on it follow the document.
 *   R8          a row the gazetteer cannot place is not silently dropped. The
 *               caption says how many, because a row missing from a picture and
 *               a row missing from the data look identical otherwise.
 *   R18         no pulse, no sweep, no animated marker. A live board that
 *               animates is a board an operator learns to stop looking at.
 */

import { useMemo, type ReactNode } from 'react'
import {
  Basemap,
  BasemapAttribution,
  fitProjection,
  MapZoomControls,
  useMapViewport,
  VIEW_W,
  type GeoPoint,
  type Projection,
} from '@/components/map'
import type { Driver, RideRequest, Trip } from '@/data/types'
import { formatCount, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'
import { captainPoint, locate, MAP_BOUNDS } from './geo'

/* ─────────────────────────── the floating panels ───────────────────────── */

/**
 * **What each panel takes out of the canvas, in CSS pixels.**
 *
 * The tiles still pave the whole box — a reserve moves what is DRAWN, never
 * what is paved — so the city runs edge to edge behind both panels and the
 * pins land in the strip between them. Each figure is the panel plus its inset
 * on both sides, so a pin never sits directly under a panel's edge.
 */
const FEED_PANEL_PX = 400
const RAIL_PANEL_PX = 300
const PANEL_INSET_PX = 12
const RESERVE_START_PX = FEED_PANEL_PX + PANEL_INSET_PX * 2
const RESERVE_END_PX = RAIL_PANEL_PX + PANEL_INSET_PX * 2

/**
 * The fit's own padding, well under `VIEW_PAD`'s 26.
 *
 * The pad is charged twice against a measure that two panels have already cut
 * to about a third of the box, so the zones board's figure would have spent
 * most of the gap on margin and drawn Riyadh the size of a postage stamp. The
 * marks carry their own visual margin anyway — a pin is 12px of circle on a
 * strip several hundred wide.
 */
const FIT_PAD = 6

/* ──────────────────────────────── the pins ─────────────────────────────── */

/** A trip or a request: two endpoints, of which only the first is drawn as a mark. */
interface RoutePin {
  id: string
  from: GeoPoint
  to: GeoPoint | null
  /** The accessible name, already assembled. */
  name: string
}

interface CaptainMark {
  id: string
  at: GeoPoint
  name: string
}

export type DispatchLayer = 'trips' | 'pending' | 'captains'

export type LayerState = Readonly<Record<DispatchLayer, boolean>>

export interface DispatchMapProps {
  trips: readonly Trip[]
  requests: readonly RideRequest[]
  captains: readonly Driver[]
  layers: LayerState
  /** The row an operator has picked, in either direction — pin or list. */
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Floats over the canvas's inline-start above the breakpoint; stacks below it. */
  startPanel: ReactNode
  /** Floats over the inline-end. */
  endPanel: ReactNode
  language: Language
  t: Translate
}

export function DispatchMap({
  trips,
  requests,
  captains,
  layers,
  selectedId,
  onSelect,
  startPanel,
  endPanel,
  language,
  t,
}: DispatchMapProps) {
  const describedBy = 'dispatch-map-desc'

  const viewport = useMapViewport()
  const { boxRef, viewH, view, panning, zoomAt, canZoomIn, canZoomOut } = viewport

  const rtl = language === 'ar'
  const reserveStart = viewport.reserveFor(RESERVE_START_PX)
  const reserveEnd = viewport.reserveFor(RESERVE_END_PX)

  /**
   * **Which physical bottom corner is free, and why it is computed rather than
   * declared.**
   *
   * The canvas is pinned `dir="ltr"` so the geography cannot mirror, which
   * means `start` and `end` INSIDE it are always left and right — but the two
   * panels floating on it follow the DOCUMENT. In English the feed is on the
   * left and runs the canvas's full height while the rail opposite it is
   * short; in Arabic they swap. So the free corner swaps with them, and the
   * zoom control and the caption both go there. Hard-coding either would put a
   * control under an opaque panel in exactly one of the two languages — which
   * is how a bug survives review.
   */
  const freeSide = rtl ? 'start' : 'end'

  const projection = useMemo<Projection>(
    () =>
      fitProjection([], {
        viewH,
        reserveStart,
        reserveEnd,
        rtl,
        view,
        pad: FIT_PAD,
        /* Declared, so the ground does not move when the board does. */
        bounds: MAP_BOUNDS,
      }),
    [viewH, reserveStart, reserveEnd, rtl, view],
  )

  /* ── rows → pins. A row the gazetteer cannot place is counted, not hidden. ── */

  const tripPins = useMemo<RoutePin[]>(
    () =>
      trips.flatMap((trip) => {
        const from = locate(trip.pickup)
        if (from === null) return []
        return [
          {
            id: trip.id,
            from,
            to: locate(trip.destination),
            name: t('dispatch.map.pin.trip', {
              id: trip.id,
              pickup: trip.pickup ?? t('dispatch.map.unknownPlace'),
              destination: trip.destination ?? t('dispatch.map.unknownPlace'),
            }),
          },
        ]
      }),
    [trips, t],
  )

  const requestPins = useMemo<RoutePin[]>(
    () =>
      requests.flatMap((request) => {
        const from = locate(request.pickup)
        if (from === null) return []
        return [
          {
            id: request.id,
            from,
            to: locate(request.destination),
            name: t('dispatch.map.pin.request', {
              id: request.id,
              pickup: request.pickup,
              destination: request.destination,
            }),
          },
        ]
      }),
    [requests, t],
  )

  const captainMarks = useMemo<CaptainMark[]>(
    () =>
      captains.flatMap((driver) => {
        const at = captainPoint(driver)
        if (at === null) return []
        return [{ id: driver.id, at, name: driver.name }]
      }),
    [captains],
  )

  /* R8 — the rows that have no point. Named in the caption, never dropped in
     silence. Captains are counted separately because they are placed from a
     registered district rather than a pickup, so the two fail for different
     reasons and an operator deserves to know which. */
  const unplaced =
    trips.length -
    tripPins.length +
    (requests.length - requestPins.length) +
    (captains.length - captainMarks.length)

  const project = (point: GeoPoint) => projection.point(point.lat, point.lng)

  return (
    <section aria-labelledby="dispatch-map-heading" className="relative flex min-h-0 flex-1 flex-col">
      <h2 id="dispatch-map-heading" className="sr-only">
        {t('dispatch.map.heading')}
      </h2>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {/* **`dir="ltr"` is the map canvas, and only the map canvas** — the
            chrome around it mirrors, the geography never does. */}
        <div
          ref={boxRef}
          dir="ltr"
          {...viewport.surfaceProps}
          /* `touch-none` so a drag on a phone pans the map instead of scrolling
             the page out from under it; the two zoom buttons are the touch
             route in, because a pinch would fight the same gesture. */
          className={cn(
            'relative aspect-4/3 w-full touch-none overflow-hidden rounded-xl border border-border bg-card select-none',
            'wide:aspect-auto wide:min-h-152 wide:flex-1 wide:rounded-none wide:border-x-0',
            view.k > 1 || panning ? (panning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
          )}
        >
          {/* Real OpenStreetMap tiles, in the same Web Mercator projection the
              marks are fitted in. It is the only thing here that can fail, and
              it removes itself after three unreachable tiles — a map with no
              streets, never a map with holes in it. */}
          <Basemap viewW={VIEW_W} viewH={viewH} projection={projection.params} />

          <svg
            viewBox={`0 0 ${VIEW_W} ${viewH}`}
            preserveAspectRatio="none"
            role="img"
            aria-labelledby={describedBy}
            className="absolute inset-0 size-full"
          >
            <desc id={describedBy}>
              {t('dispatch.map.a11y.desc', {
                trips: formatCount(tripPins.length, language),
                pending: formatCount(requestPins.length, language),
                captains: formatCount(captainMarks.length, language),
              })}
            </desc>

            {/* Pending first, so a waiting request never paints over a trip
                that already has a captain — the trip is the thing in flight. */}
            {layers.pending &&
              requestPins.map((pin) => {
                if (pin.to === null) return null
                const a = project(pin.from)
                const b = project(pin.to)
                return (
                  <line
                    key={`req-${pin.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--tone-warning-graphic)"
                    strokeWidth={selectedId === pin.id ? 1.4 : 0.8}
                    strokeOpacity={selectedId === pin.id ? 1 : 0.75}
                    /* Dashed, because the leg is not being driven yet. The
                       difference from a trip's solid line is the difference
                       between a plan and a journey. */
                    strokeDasharray="3 2.5"
                    strokeLinecap="round"
                    pointerEvents="none"
                  />
                )
              })}

            {layers.trips &&
              tripPins.map((pin) => {
                if (pin.to === null) return null
                const a = project(pin.from)
                const b = project(pin.to)
                return (
                  <g key={`trip-${pin.id}`} pointerEvents="none">
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="var(--foreground)"
                      strokeWidth={selectedId === pin.id ? 1.6 : 1}
                      strokeOpacity={selectedId === pin.id ? 0.9 : 0.5}
                      strokeLinecap="round"
                    />
                    {/* §7.5 — the destination is a SQUARE. Two ends of one
                        route are not good and bad, so they differ in shape
                        rather than in colour, and the pair reads in greyscale. */}
                    <rect
                      x={b.x - 2}
                      y={b.y - 2}
                      width={4}
                      height={4}
                      fill="var(--foreground)"
                      stroke="var(--card)"
                      strokeWidth={1}
                    />
                  </g>
                )
              })}

            {/* The fleet. Decoration on purpose: fifty-one tab stops between
                the operator and the zoom control would make the board
                unusable from a keyboard, and every captain here is a real row
                in the feed's Fleet tab. */}
            {layers.captains &&
              captainMarks.map((mark) => {
                const point = project(mark.at)
                return (
                  <circle
                    key={`cap-${mark.id}`}
                    cx={point.x}
                    cy={point.y}
                    r={2}
                    fill="var(--chart-series)"
                    stroke="var(--card)"
                    strokeWidth={0.8}
                    pointerEvents="none"
                  />
                )
              })}
          </svg>

          {/* The reachable layer: one real button per thing an operator acts on. */}
          <ul role="list" className="absolute inset-0 m-0 list-none p-0">
            {layers.trips &&
              tripPins.map((pin) => (
                <Pin
                  key={`trip-pin-${pin.id}`}
                  pin={pin}
                  kind="trip"
                  selected={selectedId === pin.id}
                  onSelect={onSelect}
                  projection={projection}
                  viewH={viewH}
                />
              ))}
            {layers.pending &&
              requestPins.map((pin) => (
                <Pin
                  key={`req-pin-${pin.id}`}
                  pin={pin}
                  kind="request"
                  selected={selectedId === pin.id}
                  onSelect={onSelect}
                  projection={projection}
                  viewH={viewH}
                />
              ))}
          </ul>

          <MapZoomControls
            zoomAt={zoomAt}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            zoomInLabel={t('dispatch.map.zoom.in')}
            zoomOutLabel={t('dispatch.map.zoom.out')}
            side={freeSide}
          />

          {/* The licence rides ON the map, over its own ground so it is never
              read against a street. It sits outside the `aria-hidden` basemap
              on purpose — a licence notice a screen reader cannot reach is not
              a licence notice. */}
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 bg-gradient-to-t from-card/90 to-transparent px-3 pt-6 pb-2 text-2xs text-muted-foreground [&_a]:pointer-events-auto',
              /* Same reasoning as `freeSide` — under the short panel, never
                 under the full-height feed. */
              freeSide === 'end' ? 'justify-end' : 'justify-start',
            )}
          >
            {unplaced > 0 && (
              <span>{t('dispatch.map.unplaced', { count: formatCount(unplaced, language) })}</span>
            )}
            <BasemapAttribution />
          </div>
        </div>

        {/* **Floating, not stacked, and only where there is room.** Above the
            breakpoint both panels sit over the map at the ends the fit has
            already reserved. Below it a 358px phone has no map left once a
            456px panel is on it, so the whole thing falls back to a stack:
            map, feed, rail, in source order. */}
        {/* **`pointer-events-none` on the column, `auto` on the cards.** The
            columns are full-height so their contents can pin to the top and to
            the bottom, and a full-height transparent box over a map is a
            full-height box the map cannot be dragged through. The panels
            themselves take their own events back. */}
        <div className="w-full wide:pointer-events-none wide:absolute wide:inset-y-3 wide:start-3 wide:z-10 wide:flex wide:w-100 wide:flex-col wide:[&>*]:pointer-events-auto">
          {startPanel}
        </div>
        <div className="flex w-full flex-col gap-3 wide:pointer-events-none wide:absolute wide:inset-y-3 wide:end-3 wide:z-10 wide:w-75 wide:overflow-y-auto wide:[&>*]:pointer-events-auto">
          {endPanel}
        </div>
      </div>
    </section>
  )
}

/**
 * One pickup mark.
 *
 * A `<button>` positioned in percentages of the box, which is exact rather than
 * approximate: the SVG draws with `preserveAspectRatio="none"` into the same
 * box, so `x / VIEW_W` of the width is the very pixel the connector starts at.
 * That equivalence is what lets the mark be a real control with a real focus
 * ring instead of an SVG node with a click handler.
 */
function Pin({
  pin,
  kind,
  selected,
  onSelect,
  projection,
  viewH,
}: {
  pin: RoutePin
  kind: 'trip' | 'request'
  selected: boolean
  onSelect: (id: string | null) => void
  projection: Projection
  viewH: number
}) {
  const point = projection.point(pin.from.lat, pin.from.lng)
  return (
    <li
      className="absolute"
      /* Genuinely dynamic — a live marker position, which is the one case
         `token-audit` grants an inline style. */
      style={{
        insetInlineStart: `${(point.x / VIEW_W) * 100}%`,
        insetBlockStart: `${(point.y / viewH) * 100}%`,
      }}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(selected ? null : pin.id)}
        className={cn(
          '-translate-x-1/2 -translate-y-1/2 rounded-full transition-transform',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          selected && 'scale-125',
        )}
      >
        <span className="sr-only">{pin.name}</span>
        <span
          aria-hidden="true"
          className={cn(
            'block rounded-full border-2 border-card',
            /* §7.5 — a trip's pickup is SOLID ink and a waiting request is an
               open amber ring. Fill versus outline reads before colour does. */
            kind === 'trip'
              ? 'size-3 bg-foreground'
              : 'size-3 border-warning-graphic bg-card ring-1 ring-warning-graphic',
          )}
        />
      </button>
    </li>
  )
}

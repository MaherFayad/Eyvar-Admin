/**
 * **The commute, on the ground it runs on** — the subscription sheet's map.
 *
 * ```
 *  ┌──────────────────────────────────────────────────┐
 *  │ ┌───────────┐                    ┌─────────────┐ │
 *  │ │ LEGS      │                    │ PAID        │ │  floating, both ends
 *  │ │ 4 of 5    │        ▪           │ 86.50 SAR   │ │
 *  │ │ 1 left    │      ╱             └─────────────┘ │
 *  │ └───────────┘    ╱                               │
 *  │                ●                          [+][−] │
 *  │ ┌──────────────────────────────────────────────┐ │
 *  │ │ ● PICKUP        Al Narjis District           │ │  floating
 *  │ │ ▪ DROP-OFF      KAFD          ⇄ round trip   │ │
 *  │ └──────────────────────────────────────────────┘ │
 *  └──────────────────────────────────────────────────┘
 * ```
 *
 * ## Why a subscription has a map at all
 *
 * It did not, until the owner said what a subscription actually is: *"all
 * subscriptions 100% is either one way or round trip that's repeated every day
 * of the subscription."* A cycle is **one route, repeated** — a commute — and
 * the route is the thing the rider bought. `types/subscription.ts` carries it
 * now, so this map draws the record's own two fields and never a scan of its
 * legs; most cycles have no leg recorded yet, and a record whose route depends
 * on rows that may not exist is a record that cannot answer for itself.
 *
 * ## The one mark this map has that a ride's does not
 *
 * **Direction.** A `round-trip` cycle runs the leg and comes back, which is the
 * difference between five legs a week and ten, so the connector carries an
 * arrowhead at each end and the endpoint card names the kind in words. A
 * `one-way` cycle points one way. Shape and text, never colour alone (§7.5).
 *
 * Everything else is `RequestMap`'s reading, unchanged and for the same
 * reasons: the connector is **dashed** because a commitment is a plan rather
 * than a journey anybody is driving right now; the two ends differ in SHAPE as
 * well as position; and the figure under the map says `straight line`, never
 * `distance`, because it is the crow-flies gap between two hand-placed district
 * anchors (`components/map/places.ts`).
 *
 * Rules applied
 *   §9.1        the canvas is pinned `dir="ltr"` and ONLY the canvas — north is
 *               up and east is right of west in every locale. The chrome around
 *               it follows the document.
 *   §7.5        shape carries the reading; colour is the second signal.
 *   §11.3       no spinner. Tiles fade in as they land.
 *   R18         nothing pulses or loops.
 *   AC-30       zoom is reachable from the keyboard through two real buttons.
 *   a11y        the SVG is the labelled picture (`role="img"` + `<desc>`); the
 *               basemap under it is `aria-hidden`. Every floating figure is real
 *               text, so nothing here exists only as a picture.
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
import type { Subscription } from '@/data/types'
import { formatDecimal, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

/** Breathing room between a mark and the usable frame, in view units. */
const PAD = 14

/**
 * What the floating cards cover, in CSS pixels, at each end of the canvas —
 * the same measurement `RequestMap` makes, for the same two cards. A mark drawn
 * under the card that names it is the one arrangement worse than not drawing
 * it, so `fitProjection` gives both ends back through its block reserves.
 */
const COVER_TOP_PX = 64
const COVER_BOTTOM_PX = 54

export interface SubscriptionMapProps {
  subscription: Subscription
  from: GeoPoint | null
  to: GeoPoint | null
  /** The two floating figures. See `SubscriptionFigures`. */
  figures: React.ReactNode
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
 * The commute's two ends, resolved once. Exported because the sheet decides its
 * layout on whether there is a map at all, and a second `locate` call there
 * would be a second chance for the two to disagree about what is placeable.
 */
export function subscriptionPoints(subscription: Subscription): {
  from: GeoPoint | null
  to: GeoPoint | null
} {
  return { from: locate(subscription.pickup), to: locate(subscription.destination) }
}

/** Whether there is a picture to draw. One end placed is enough for a map. */
export function hasSubscriptionMap(subscription: Subscription): boolean {
  const { from, to } = subscriptionPoints(subscription)
  return from !== null || to !== null
}

export function SubscriptionMap({
  subscription,
  from,
  to,
  figures,
  variant = 'inline',
  t,
  language,
}: SubscriptionMapProps) {
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
  const describedBy = `subscription-map-${subscription.id}`
  const returns = subscription.tripKind === 'round-trip'

  const unplaced = [
    from === null ? subscription.pickup : null,
    to === null ? subscription.destination : null,
  ].filter((place): place is string => place !== null)

  return (
    <section
      aria-labelledby={`${describedBy}-heading`}
      className={cn('flex flex-col', !isInline && 'h-full')}
    >
      <h3 id={`${describedBy}-heading`} className="sr-only">
        {t('profile.subscription.map.heading')}
      </h3>

      <div
        ref={boxRef}
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
          'relative w-full touch-none overflow-hidden bg-muted select-none',
          isInline
            ? 'h-64 border-b border-border'
            : 'h-full rounded-lg border border-border',
          view.k > 1 || panning ? (panning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
          isInline && view.k === 1 && !panning && 'cursor-zoom-in',
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
            {t(
              returns
                ? 'profile.subscription.map.a11y.roundTrip'
                : 'profile.subscription.map.a11y.oneWay',
              { pickup: subscription.pickup, destination: subscription.destination },
            )}
          </desc>

          {/* The arrowheads. Two markers rather than one flipped, because SVG
              `marker-start` does not rotate a shared definition the way an
              author expects and a commute that points the wrong way is a
              commute in the wrong direction. */}
          <defs>
            <marker
              id={`${describedBy}-fwd`}
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--foreground)" fillOpacity="0.55" />
            </marker>
            <marker
              id={`${describedBy}-back`}
              viewBox="0 0 8 8"
              refX="2"
              refY="4"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M 8 1 L 1 4 L 8 7 z" fill="var(--foreground)" fillOpacity="0.55" />
            </marker>
          </defs>

          {a && b && (
            /* Dashed: a commitment is a plan, not a journey being driven. The
               arrowheads are the one thing a ride's connector does not carry —
               a round trip runs the leg and comes back, which is why
               `tripKind` is a field and not a guess. */
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
              markerEnd={`url(#${describedBy}-fwd)`}
              markerStart={returns ? `url(#${describedBy}-back)` : undefined}
            />
          )}

          {b && (
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

        {/* `pointer-events-none` throughout: nothing on the layer is
            interactive, and a transparent box over a map is a box the map
            cannot be dragged through. */}
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
          {/* **T5.11** — the expand control is a 28px button at `end-2` on this
              same corner, and the `Paid` tile was reading `PA` under it. The
              tile row keeps clear of it while the control is drawn; the
              expanded map has none, so it takes the full measure. */}
          <div className={cn(isInline && 'pe-9')}>{figures}</div>

          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card/95 px-3 py-2">
            <Endpoint
              mark="pickup"
              label={t('profile.request.map.pickup')}
              place={subscription.pickup}
              placed={from !== null}
            />
            <Endpoint
              mark="destination"
              label={t('profile.request.map.destination')}
              place={subscription.destination}
              placed={to !== null}
              /* §7.5 — the direction is a WORD as well as an arrowhead, so the
                 difference between five legs a week and ten survives greyscale
                 and survives a reader who never looks at the canvas. */
              trailing={t(
                returns
                  ? 'profile.subscription.map.roundTrip'
                  : 'profile.subscription.map.oneWay',
              )}
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

      {/* The same component, again, at viewport size. The floating figures come
          with it: they are the caller's node and the expanded map is the same
          component, so nothing is re-assembled. */}
      {isInline && expanded && (
        <MapDialog
          open
          onOpenChange={setExpanded}
          title={t('requests.route', {
            pickup: subscription.pickup,
            destination: subscription.destination,
          })}
          description={t('profile.request.map.dialogNote')}
        >
          <SubscriptionMap
            subscription={subscription}
            from={from}
            to={to}
            figures={figures}
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
 * One end of the commute. The mark is `aria-hidden` — it is the picture's key,
 * and the row already says `Pickup` in words. A place the gazetteer could not
 * resolve renders its mark hollow, so the row and the canvas agree about what
 * is drawn.
 */
function Endpoint({
  mark,
  label,
  place,
  placed,
  trailing = null,
}: {
  mark: 'pickup' | 'destination'
  label: string
  place: string
  placed: boolean
  trailing?: string | null
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
      {trailing !== null && (
        <span className="ms-auto shrink-0 text-2xs text-muted-foreground">{trailing}</span>
      )}
    </p>
  )
}

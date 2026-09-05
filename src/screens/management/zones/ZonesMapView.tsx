/**
 * Management › Market & Zones — **a choropleth of our own zone polygons over
 * `Basemap`,** which owns the tile source and its licence (X11, **O2**).
 *
 * The zones themselves are Eyvar's data and are drawn as vectors, so the board
 * still answers *where is demand starved* if the tiles never arrive: `Basemap`
 * removes itself after three failures rather than leaving holes.
 *
 * **Never name a Tailwind class in a comment here.** Tailwind v4 scans comments
 * as plain text, so a class written literally is re-emitted into `dist`; that is
 * how an R18 loop and a physical margin both shipped out of comments forbidding
 * them. Name the parts, and verify in `dist`.
 *
 * Every zone is reachable two ways, because a map that only answers a mouse
 * gives an operator nothing: a `<button>` marker on the canvas and a `<button>`
 * row in the list, both with `aria-pressed` and a focus ring. The SVG is
 * `role="img"` with a title and a description, never the only route.
 *
 * Rules applied
 *   R5a          red appears here in exactly one place, and it is the licensed
 *                one: **a map marker**. A starved zone's marker carries a
 *                `bg-destructive` dot. No red fill, no red badge, no red text.
 *   §7.5         colour never carries meaning alone. Every marker prints its
 *                own number, and the priority word rides in the accessible
 *                name; greyscale loses nothing.
 *   R7           the five tones, through `RECRUITMENT_PRIORITY_TONE` — the same
 *                map the table uses, so the two surfaces cannot disagree.
 *   §6.1         the choropleth ramp is `--chart-series` at a computed opacity.
 *                One token, one dimension. There is no sequential ramp token in
 *                `globals.css` and one was NOT invented here — see the handoff.
 *   §9.1 / rtl.md
 *                chrome mirrors; **the canvas does not.** The canvas carries
 *                `dir="ltr"` so north stays up and east stays inline-end of
 *                west in Arabic, exactly as `rtl.md` requires, while every
 *                utility in the file stays logical.
 *   R18          nothing loops. The only motion is `Skeleton`'s pulse, which
 *                means *still arriving* and dies under `prefers-reduced-motion`.
 *   states.md    four states, in order: content, empty, loading, error — and
 *                the two kinds of empty are distinguished, because a search
 *                filtered to zero is not a zone table that was never seeded.
 *   R-3 §1.3     the canvas and the aside are cards. Tier 1, no second shadow.
 */

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { ErrorState, canRetry } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
/* **The map layer is shared now.** Live Dispatch draws the same city, and two
   copies of a projection are two chances for the streets and the shapes on top
   of them to drift apart. See `src/components/map/projection.ts`. */
import {
  Basemap,
  BasemapAttribution,
  fitProjection as fitPoints,
  MapZoomControls,
  useMapViewport,
  VIEW_W,
  type GeoPoint,
  type MapView,
  type Projection,
} from '@/components/map'
import { RECRUITMENT_PRIORITY_TONE, type Zone } from '@/data/types'
import type { AsyncStatus } from '@/hooks'
import { ABSENT, formatCount, formatPercent, formatRatio, type Language, type Translate } from '@/lib'

/* ─────────────────────────── our own geometry ──────────────────────────── */

/**
 * Zone boundaries in WGS84, **ours**.
 *
 * **They are now approximately where the districts are.** What this file
 * inherited was six identical rotated squares of the same size, three of them
 * placed on the wrong district entirely — KAFD / Olaya sat on Al Yasmin's
 * ground, Al Yasmin sat on Qurtubah's, and Qurtubah sat in the middle of the
 * city it is on the eastern edge of. Two of them overlapped on screen, which is
 * the one thing a choropleth may never do: an operator reading two stacked
 * shapes cannot tell which district the darker one is.
 *
 * These follow the real districts to the nearest major road, which is the level
 * of precision a demand map needs and the level a hand-written table can hold
 * honestly. North Riyadh's blocks are near-rectangular and aligned to its grid;
 * KAFD / Olaya is a corridor down King Fahd Road and is drawn as one, because
 * that is the shape of the thing. **Not a survey**: the boundary a dispatcher
 * settles a fare against comes from the backend, and when it does it replaces
 * this table wholesale.
 *
 * A zone with no entry here is not silently dropped — `unmapped` below states
 * it in words, because a zone missing from a picture and a zone missing from
 * the data look identical once you stop saying which it is.
 */
interface ZoneGeometry {
  /** The marker anchor — a chosen centre, not a computed centroid. */
  lat: number
  lng: number
  /** The boundary ring, in order. */
  path: readonly { lat: number; lng: number }[]
}

const ZONE_GEOMETRY: Readonly<Record<string, ZoneGeometry>> = {
  /* **Al Narjis** — the far north, above Anas Ibn Malik Road and below the
     Al Qayrawan strip, running from King Abdulaziz Road across to Abu Bakr
     Al-Siddiq. Its south-east corner is cut where Al Yasmin comes up to meet
     it, which is why this one is a pentagon and its neighbours are not. */
  'ZONE-01': {
    lat: 24.8555,
    lng: 46.6575,
    path: [
      { lat: 24.8725, lng: 46.6355 },
      { lat: 24.8725, lng: 46.6805 },
      { lat: 24.8555, lng: 46.6835 },
      { lat: 24.8385, lng: 46.6795 },
      { lat: 24.8385, lng: 46.6365 },
    ],
  },
  /* **Al Sahafa** — south of Al Narjis and west of Al Yasmin, the block
     between King Fahd Road and Al Imam Saud Bin Abdulaziz. */
  'ZONE-02': {
    lat: 24.8175,
    lng: 46.6375,
    path: [
      { lat: 24.8375, lng: 46.6175 },
      { lat: 24.8375, lng: 46.6615 },
      { lat: 24.7985, lng: 46.6565 },
      { lat: 24.7975, lng: 46.6125 },
    ],
  },
  /* **KAFD / Olaya** — one zone because it is one corridor: the financial
     district at the northern ring, and the Olaya spine running south from it
     along King Fahd Road to the Kingdom tower. It is the only zone here that
     is neither a grid block nor near square, and drawing it as one would put
     Olaya's demand two kilometres west of the road it happens on. */
  'ZONE-03': {
    lat: 24.7400,
    lng: 46.6620,
    path: [
      { lat: 24.7810, lng: 46.6320 },
      { lat: 24.7810, lng: 46.6605 },
      { lat: 24.7280, lng: 46.6925 },
      { lat: 24.6905, lng: 46.6905 },
      { lat: 24.6905, lng: 46.6640 },
      { lat: 24.7380, lng: 46.6320 },
    ],
  },
  /* **Al Malaz** — central-east and on the older grid, between Salahuddin
     Al-Ayyubi and the Khurais corridor. */
  'ZONE-04': {
    lat: 24.6670,
    lng: 46.7370,
    path: [
      { lat: 24.6885, lng: 46.7150 },
      { lat: 24.6900, lng: 46.7585 },
      { lat: 24.6480, lng: 46.7620 },
      { lat: 24.6455, lng: 46.7180 },
    ],
  },
  /* **Qurtubah** — the eastern edge of the built city, north of Khurais Road
     and beyond Uthman Bin Affan. Nothing else on this board is out here, which
     is the reading: its ratio is the lowest and its supply travels furthest. */
  'ZONE-05': {
    lat: 24.7970,
    lng: 46.7800,
    path: [
      { lat: 24.8160, lng: 46.7520 },
      { lat: 24.8180, lng: 46.8065 },
      { lat: 24.7820, lng: 46.8080 },
      { lat: 24.7765, lng: 46.7545 },
    ],
  },
  /* **Al Yasmin** — east of Al Sahafa and south of Al Narjis, out to Uthman
     Bin Affan Road. */
  'ZONE-06': {
    lat: 24.8215,
    lng: 46.6900,
    path: [
      { lat: 24.8375, lng: 46.6660 },
      { lat: 24.8375, lng: 46.7140 },
      { lat: 24.8055, lng: 46.7160 },
      { lat: 24.8025, lng: 46.6650 },
    ],
  },
}

/* ────────────────────────── the drawing surface ────────────────────────── */

/**
 * **The width the floating panel takes out of the canvas, in CSS pixels.**
 *
 * 376 for the panel, 24 for its inset and 24 again so a district never sits
 * directly under its own edge. Above the breakpoint the panel covers this much
 * of the map, so fitting the districts to the FULL box centred half of them
 * behind it; the fit reserves the strip instead. Below the breakpoint the panel
 * is stacked under the map and nothing is reserved.
 */
const PANEL_RESERVE_PX = 424

/**
 * Fit the zones' own geometry, through the shared projection.
 *
 * A `ZoneGeometry` is a ring plus a chosen anchor, and both have to be inside
 * the frame — the anchor because the marker sits on it, the ring because a
 * district clipped at the edge is a district drawn wrong. Flattening the two
 * into one point list is the only zone-specific thing left here; everything
 * below it is `components/map`, which Live Dispatch fits the same way.
 */
function fitProjection(
  geometries: readonly ZoneGeometry[],
  viewH: number,
  /** View units the floating panel covers, on the inline-end of the canvas. */
  reserve: number,
  /** Which end that is — the panel follows the document's direction. */
  rtl: boolean,
  view: MapView,
): Projection {
  const points: GeoPoint[] = []
  for (const geometry of geometries) {
    for (const vertex of geometry.path) points.push(vertex)
    points.push({ lat: geometry.lat, lng: geometry.lng })
  }
  return fitPoints(points, { viewH, reserveEnd: reserve, rtl, view })
}

/**
 * The smallest vertical gap, in view units, between two marker chips that also
 * overlap horizontally. A chip is ~26 CSS px tall and the canvas renders
 * `VIEW_H` units into roughly twice that many pixels, so 13 units clears one
 * chip with a hairline to spare.
 */
const LABEL_MIN_GAP = 13
/** Chips wider apart than this cannot collide, so they are never displaced. */
const LABEL_MIN_SPREAD = 58

/**
 * Where each marker chip sits, after nudging the ones that would sit on top of
 * each other.
 *
 * Al Narjis, Al Sahafa, Al Yasmin and KAFD / Olaya are within two kilometres of
 * one another, so at any honest scale their labels overlap and the map stops
 * being readable — which is the failure mode that makes an operator go back to
 * the table. The chips are pushed apart on the **vertical** axis only, in a
 * single deterministic pass over the zones in north-to-south order, and a
 * leader line is drawn from the true point to any chip that moved. The
 * GEOMETRY is never moved: the polygon and the anchor stay where they are, and
 * only the label admits it has been nudged.
 */
interface MarkerPlacement {
  /** The true point — where the leader line starts. */
  anchorX: number
  anchorY: number
  /** Where the chip goes. Equal to the anchor unless it was displaced. */
  labelX: number
  labelY: number
  displaced: boolean
}

function placeMarkers(
  zones: readonly Zone[],
  projection: Projection,
  viewH: number,
): ReadonlyMap<string, MarkerPlacement> {
  const anchored = zones
    .map((zone) => {
      const geometry = ZONE_GEOMETRY[zone.id]
      if (!geometry) return null
      const point = projection.point(geometry.lat, geometry.lng)
      return { id: zone.id, x: point.x, y: point.y }
    })
    .filter((each): each is { id: string; x: number; y: number } => each !== null)
    .sort((a, b) => a.y - b.y || a.x - b.x)

  const placed: MarkerPlacement[] = []
  const byId = new Map<string, MarkerPlacement>()

  for (const anchor of anchored) {
    let labelY = anchor.y
    /* One pass, against everything already placed. Six zones; the cost of a
       cleverer algorithm is not worth the second reading of it. */
    for (const other of placed) {
      if (Math.abs(other.labelX - anchor.x) >= LABEL_MIN_SPREAD) continue
      if (labelY - other.labelY >= LABEL_MIN_GAP) continue
      labelY = other.labelY + LABEL_MIN_GAP
    }
    const placement: MarkerPlacement = {
      anchorX: anchor.x,
      anchorY: anchor.y,
      labelX: anchor.x,
      labelY: Math.min(labelY, viewH - 4),
      displaced: Math.abs(labelY - anchor.y) > 0.5,
    }
    placed.push(placement)
    byId.set(anchor.id, placement)
  }

  return byId
}


/* ──────────────────────────── the measure ──────────────────────────────── */

/** The three readings the map can shade by. Each one the table also carries. */
export type ZoneHeatMetric = 'ratio' | 'failure' | 'demand'

export const HEAT_METRICS: readonly ZoneHeatMetric[] = ['ratio', 'failure', 'demand']

/**
 * The lightest and darkest the ramp goes. Two numbers, so the ramp is one line.
 *
 * **There is no longer a switch that turns this off.** `Hide shading` was a
 * control for a map whose shading was one green in varying alpha — dense enough
 * over street tiles that an operator might genuinely want it out of the way.
 * The fill is now a hue with a floor of 0.12 and a ceiling of 0.34: it names
 * which districts are starved and it does not hide the streets under them.
 * A toggle whose off state is strictly worse is a control with one real value.
 */
const SHADE_FLOOR = 0.12
const SHADE_CEILING = 0.34

/** The selected district, which is filled hard enough to find without hunting. */
const SHADE_SELECTED = 0.42

/**
 * **Whether the district is the bad news, which is a HUE and not a step of the
 * ramp.**
 *
 * The map shaded one green in varying alpha, so a zone with seven requests per
 * captain and a zone with one differed only by how dark they were — and alpha
 * over a street map is the least readable channel there is. The reference
 * splits the two apart: the fill's alpha says *how much of the chosen measure*,
 * and the fill's HUE says *is this zone starved*, red above the line and green
 * below it.
 *
 * `Zone.starved` is that line and it is already the domain's own, so no
 * threshold is invented here — it is the same flag the strip counts, the same
 * flag the marker dot draws, and the same flag the accessible name says in
 * words. That is also why the hue holds for all three measures: it answers a
 * question about the zone, not about the measure on the switch.
 */
function isHot(zone: Zone): boolean {
  return zone.starved || zone.demandSupplyRatio === null
}

/**
 * `0`–`1` for the chosen measure, used as the fill's alpha.
 *
 * **A zone with no captains shades at the top of the ramp, not at zero.** Its
 * `demandSupplyRatio` is `null` — no ratio exists — and the honest reading of
 * *demand with nobody to serve it* is the most starved state there is, which is
 * exactly the correction `Zone.starved` already records against legacy's own
 * `supply > 0` guard.
 */
function intensity(zone: Zone, metric: ZoneHeatMetric, peak: ZonePeaks): number {
  if (metric === 'failure') return Math.min(Math.max(zone.failureRate, 0), 100) / 100
  if (metric === 'demand') return peak.demand === 0 ? 0 : Math.min(zone.demand / peak.demand, 1)
  if (zone.demandSupplyRatio === null) return 1
  /* Four demand per captain is well past starved (3); above it the ramp is flat. */
  return Math.min(zone.demandSupplyRatio / 4, 1)
}

/**
 * The two peaks the ramps normalise against, carried together so a third metric
 * cannot arrive with a fourth argument.
 */
interface ZonePeaks {
  demand: number
  ratio: number
}

/**
 * **The BAR's length, which is not the canvas's alpha, and conflating them was
 * the defect.**
 *
 * `intensity` is a SHADING ramp. Its flat top above four demand per captain is
 * deliberate and documented — past starved, darker says nothing an operator can
 * act on. A ramp with a ceiling is a fine thing to pour into an alpha channel.
 *
 * It is not a fine thing to pour into a LENGTH. A bar states a quantity by how
 * far it runs, so it has exactly one contract: twice the value, twice the bar.
 * Measured in the rail at 1440 before this split, with the ratio metric
 * selected: `7.0×` drew 100%, `3.0×` drew 75% and `2.8×` drew 69%. Al Sahafa is
 * 43% of Al Narjis and its bar was three quarters as long as it — the shape an
 * operator reads first said the two zones were comparable when one is more than
 * twice the other.
 *
 * So the bar normalises against the largest value PRESENT, with no ceiling.
 * `failure` is already a share of a fixed 100 and stays that way — normalising a
 * percentage against the worst row would make a 3%-failure list look like a
 * catastrophe. A zone with no captains has no ratio, prints an em dash, and
 * draws the full bar: no captains for live demand is the top of the scale, not
 * an absence, which is the same reading `Zone.starved` already takes.
 */
function barShare(zone: Zone, metric: ZoneHeatMetric, peak: ZonePeaks): number {
  if (metric === 'failure') return Math.min(Math.max(zone.failureRate, 0), 100) / 100
  if (metric === 'demand')
    return peak.demand === 0 ? 0 : Math.min(zone.demand / peak.demand, 1)
  if (zone.demandSupplyRatio === null) return 1
  return peak.ratio === 0 ? 0 : Math.min(zone.demandSupplyRatio / peak.ratio, 1)
}

/** The value the marker prints. Never a bare colour — §7.5. */
function readingFor(
  zone: Zone,
  metric: ZoneHeatMetric,
  language: Language,
  t: Translate,
): string {
  if (metric === 'failure') return formatPercent(zone.failureRate, language)
  if (metric === 'demand') return t('zones.map.reading.demand', {
    count: formatCount(zone.demand, language),
  })
  return zone.demandSupplyRatio === null ? ABSENT : formatRatio(zone.demandSupplyRatio, language)
}

/* ──────────────────────────────── props ────────────────────────────────── */

export interface ZonesMapViewProps {
  zones: readonly Zone[]
  onSteer: (zone: Zone) => void
  onQueueRecruitment: (zone: Zone) => void
  language?: Language
  /**
   * **§11.2 reaches the map.** The table's two row actions are disabled in
   * place with a stated reason when the operator's role cannot act or the
   * shell is frozen; the inspector's copies of the same two actions are too.
   * Passed in rather than re-derived, so the two surfaces cannot disagree.
   */
  canWrite: boolean
  /**
   * The read's own state. The map states all four for **its own region** — the
   * ruling this replaces (`ZonesScreen`, "a map that draws an identical basemap
   * whether the data is loading, empty or broken is not a content state") is
   * satisfied by giving the map real states, which is what this prop is for.
   * `DataTable` still owns the table's; the shapes differ because the surfaces
   * differ, which is R8's rule rather than a duplication of it.
   */
  status?: AsyncStatus
  /** The thrown failure. Read for `ApiError.retryable` and nothing else. */
  error?: unknown
  /** Re-runs the same read. Required whenever `status` can be `error`. */
  onRetry?: () => void
  t: Translate
}

/* ─────────────────────────────── the view ──────────────────────────────── */

export function ZonesMapView({
  zones,
  onSteer,
  onQueueRecruitment,
  language = 'en',
  canWrite,
  status = 'content',
  error,
  onRetry,
  t,
}: ZonesMapViewProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  /* **The measure lives with the list it orders.** It spent a version on the
     dark band beside the board's title, which is where the reference draws it;
     the owner moved it into the panel, above the rows it ranks, and that is the
     better home for it — the tabs, the eyebrow that names the sort and the
     column of numbers they order are then one object rather than a control at
     one end of the screen acting on a list at the other. */
  const [metric, setMetric] = useState<ZoneHeatMetric>('ratio')

  const mapped = useMemo(() => zones.filter((zone) => zone.id in ZONE_GEOMETRY), [zones])
  const unmapped = useMemo(() => zones.filter((zone) => !(zone.id in ZONE_GEOMETRY)), [zones])

  /**
   * **Computed over every zone, not over the mapped ones and not over the
   * matched ones.** The list beside the canvas draws bars for `matches`, so a
   * peak taken from the search result would re-length every bar as the operator
   * types — the same zone drawn twice as long because a longer zone stopped
   * matching. A scale that moves under a filter is not a scale.
   */
  const peaks = useMemo<ZonePeaks>(
    () => ({
      demand: zones.reduce((peak, zone) => Math.max(peak, zone.demand), 0),
      ratio: zones.reduce((peak, zone) => Math.max(peak, zone.demandSupplyRatio ?? 0), 0),
    }),
    [zones],
  )

  /* **The panel opens on the worst zone rather than on nothing.**
     The rows arrive worst-first, so `mapped[0]` is the district with the
     highest demand-to-supply ratio — the one the board exists to surface, and
     the one the reference shows selected when the screen loads. An operator
     who lands here and sees `Pick a zone` has to do a click to reach the
     information they came for, and the click has no wrong answer.

     **Derived, not seeded into state.** A `useState(mapped[0]?.id)` would
     freeze the initial row and keep pointing at a zone that had dropped out of
     the filtered set. This falls back only while nothing is chosen, so an
     explicit selection still wins and a `null` here still means an empty set —
     which is what keeps `Inspector`'s no-selection state reachable rather than
     dead. */
  const effectiveZoneId = selectedZoneId ?? mapped[0]?.id ?? null

  const selected = useMemo(
    () => zones.find((zone) => zone.id === effectiveZoneId) ?? null,
    [zones, effectiveZoneId],
  )

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (status === 'loading') {
    return <ZonesMapSkeleton label={t('zones.map.loading')} />
  }

  /* ── error ───────────────────────────────────────────────────────────── */
  if (status === 'error') {
    /**
     * **`Try again` is gated on `ApiError.retryable`, and `ErrorState` owns the
     * gate** (P1-8): `cause` goes in, and the action is dropped for a 401, 403,
     * 404, 409 or 422 — a retry that fails identically is a lie told to an
     * operator under time pressure. `canRetry` is read here only to pick the
     * sentence, because "read again" is not the fix when reading again cannot
     * work; the button itself is never suppressed at this call site.
     */
    return (
      <ErrorState
        scope="card"
        cause={error}
        message={canRetry(error) ? t('zones.map.error') : t('zones.map.error.final')}
        action={{ label: t('zones.error.retry'), onClick: () => onRetry?.() }}
      />
    )
  }

  /* ── empty, first run ────────────────────────────────────────────────── */
  if (status === 'empty' || zones.length === 0) {
    /* R8: a SECTION empty is one grey sentence, never the illustration — the
       illustration belongs to `DataTable` below, which owns the page's answer
       to "no zone is tracked". R5-11's third sentence, because nothing is
       recorded rather than nothing ranking or nothing in range. */
    return (
      <EmptyState kind="no-match" message={t('zones.map.empty')} />
    )
  }

  /* ── content ─────────────────────────────────────────────────────────── */
  return (
    /* **The map is the screen and it takes the screen.** It used to be a
       card in the page block sharing a row with a 320px aside: at 1440 that
       left the canvas ~660px, and the districts of a city were being read in a
       box a third the width of the console. The reference gives the map the
       whole content region and floats the inspector ON it, which is what every
       map product does and what the owner asked for.

       `relative` here, `absolute` on the panel — no negative margins. The
       region is full-bleed because `ZonesScreen` renders this in
       `SingleColumnPage`'s `bleed` slot, beside the band and the strip; see
       that prop for why a bleed is a sibling of the measure rather than an
       escape from it. */
    /* `flex-1` so the map takes whatever height the console has left after the
       band and the strip. It used to be a declared 760px — the reference's own
       number — which left a band of dead ground under the legend on anything
       taller than a laptop and clipped the panel on anything shorter. */
    <section
      aria-labelledby="zones-map-heading"
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <h2 id="zones-map-heading" className="sr-only">
        {t('zones.map.heading')}
      </h2>

      {/* **Floating, not stacked, and only where there is room for both.**
          Above the breakpoint the panel sits over the map's inline-end with the
          measure switch opposite it, exactly as the reference draws them.
          Below it the two float over nothing — a 358px phone has no map left
          once a 320px panel is on it — so the whole thing falls back to the
          stack it was: switch, map, panel, in source order. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <MapCanvas
          zones={mapped}
          unmapped={unmapped}
          metric={metric}
          peaks={peaks}
          selectedZoneId={effectiveZoneId}
          onSelect={setSelectedZoneId}
          language={language}
          t={t}
        />

        {/* **ONE panel, not two stacked cards.** The reference draws a single
            box floating on the map: the selected zone at the top, a rule, and
            the scrollable list of all of them under it. Two cards with a gap
            between them showed a stripe of map through the middle of what is
            one object, and gave the operator two shadows to read as two
            different kinds of thing.

            `divide-y` is safe here where it was not on the KPI strip: this
            divides on the BLOCK axis, which does not mirror. */}
        <aside className="flex w-full shrink-0 flex-col divide-y divide-border overflow-hidden rounded-xl border border-card-border bg-card shadow-2 wide:absolute wide:inset-y-2 wide:end-3 wide:z-10 wide:w-94">
          {/* **The selection keeps its height; the LIST is what scrolls.**
              The panel is `inset-y` above the breakpoint, so it has a fixed
              height and something inside it has to give. Without `shrink-0`
              flexbox took it out of the selection block — which clipped the
              sentence and both actions, the two things an operator came to the
              panel to use — and left the list at full height. */}
          <div className="shrink-0">
            <Inspector
              zone={selected}
              canWrite={canWrite}
              onSteer={onSteer}
              onQueueRecruitment={onQueueRecruitment}
              language={language}
              t={t}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ZoneList
            zones={zones}
            metric={metric}
            onMetric={setMetric}
            peaks={peaks}
            selectedZoneId={effectiveZoneId}
            onSelect={setSelectedZoneId}
            language={language}
            t={t}
          />
          </div>
        </aside>
      </div>
    </section>
  )
}

/** A narrowing predicate, so the projection never sees an `undefined` lookup. */
function isGeometry(value: ZoneGeometry | undefined): value is ZoneGeometry {
  return value !== undefined
}

/* ─────────────────────────────── toolbar ───────────────────────────────── */


/* ──────────────────────────────── canvas ───────────────────────────────── */

function MapCanvas({
  zones,
  unmapped,
  metric,
  peaks,
  selectedZoneId,
  onSelect,
  language,
  t,
}: {
  zones: readonly Zone[]
  unmapped: readonly Zone[]
  metric: ZoneHeatMetric
  peaks: ZonePeaks
  selectedZoneId: string | null
  onSelect: (id: string) => void
  language: Language
  t: Translate
}) {
  const describedBy = 'zones-map-desc'

  /* **The surface — measure, wheel, drag, zoom — is `components/map`'s now.**
     Live Dispatch needs the identical behaviour under a different set of pins,
     and 140 lines of pointer arithmetic in two files is how two maps of one
     city start behaving differently on a trackpad. */
  const viewport = useMapViewport()
  const { boxRef, viewH, view, panning, zoomAt, canZoomIn, canZoomOut } = viewport

  /* The panel floats over the map only above the breakpoint; below it, it is
     stacked underneath and covers nothing. The reserve is measured against the
     CANVAS's width rather than the window's, which is the width the panel
     actually eats. */
  const reserve = viewport.reserveFor(PANEL_RESERVE_PX)

  /* **The corner the floating panel is not in.** The canvas is pinned
     `dir="ltr"` so `start` does not mirror inside it, while the panel is
     document-`end` — the canvas's left in Arabic. The zoom stack and the
     caption both take this side, or Arabic buries them under the panel. */
  const free = language === 'ar' ? 'end' : 'start'

  const projection = useMemo(
    () =>
      fitProjection(
        zones.map((zone) => ZONE_GEOMETRY[zone.id]).filter(isGeometry),
        viewH,
        reserve,
        language === 'ar',
        view,
      ),
    [zones, viewH, reserve, language, view],
  )

  const placements = placeMarkers(zones, projection, viewH)


  return (
    <figure className="m-0 flex min-h-0 min-w-0 flex-1 flex-col gap-2 wide:gap-0">
      {/*
        **`dir="ltr"` is the map canvas, and only the map canvas.** `rtl.md`:
        the canvas, its markers and its compass do NOT mirror in Arabic — north
        is up and east is inline-end of west in every locale — while the chrome
        around it does. Pinning the direction here is what lets every utility in
        this file stay logical without the geometry flipping under Arabic.
      */}
      {/* **No radius and no border above the breakpoint.** The canvas IS the
          region now, so an 8px corner would be a card edge drawn against the
          console's own edge. Below it the map is still a block on a padded
          page and keeps the card treatment it had.

          The aspect ratio holds on a phone. Above the breakpoint the map takes
          the region's RESIDUAL height (T2.1): a declared height overshot what
          the minimum viewport had left, so the panel floating on it ran past
          the fold. The floor is what a choropleth still reads at. */}
      <div
        ref={boxRef}
        dir="ltr"
        {...viewport.surfaceProps}
        /* `touch-none` so a drag on a phone pans the map instead of scrolling
           the page out from under it; the two zoom buttons are the touch route
           in, because a pinch would fight the same gesture. */
        className={cn(
          'relative aspect-4/3 w-full touch-none overflow-hidden rounded-xl border border-card-border bg-card select-none wide:aspect-auto wide:min-h-100 wide:flex-1 wide:rounded-none wide:border-x-0',
          view.k > 1 || panning ? (panning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
        )}
      >
        {/* **The basemap, under everything.** Real OpenStreetMap tiles in the
            same Web Mercator projection the polygons are fitted in, so the
            districts sit on their own streets rather than on blank ground.

            It is first in the box and the SVG paints over it. It is also the
            only thing here that can fail: `Basemap` removes itself after three
            unreachable tiles, and what is left is exactly the self-contained
            choropleth this screen was before — a map with no streets, never a
            map with holes in it. See `Basemap` for the licence, which is why
            these are OSM's tiles and not Google's. */}
        <Basemap viewW={VIEW_W} viewH={viewH} projection={projection.params} />

        <svg
          viewBox={`0 0 ${VIEW_W} ${viewH}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={describedBy}
          className="absolute inset-0 size-full"
        >
          <desc id={describedBy}>
            {t('zones.map.a11y.desc', {
              count: formatCount(zones.length, language),
              metric: t(`zones.map.metric.${metric}`),
            })}
          </desc>

          {zones.map((zone) => {
            const geometry = ZONE_GEOMETRY[zone.id]
            if (!geometry) return null
            const points = geometry.path
              .map((vertex) => {
                const projected = projection.point(vertex.lat, vertex.lng)
                return `${projected.x.toFixed(2)},${projected.y.toFixed(2)}`
              })
              .join(' ')
            const selectedHere = selectedZoneId === zone.id
            const hot = isHot(zone)
            /* Two tokens, two dimensions — see `isHot`. Both are tokens the
               product already owns: `--chart-series` is the series green and
               `--destructive` is R5a's red, whose fourth permitted use is
               exactly this, a map marker for a zone in trouble. */
            const hue = hot ? 'var(--destructive)' : 'var(--chart-series)'
            const alpha =
              SHADE_FLOOR + intensity(zone, metric, peaks) * (SHADE_CEILING - SHADE_FLOOR)

            return (
              <polygon
                key={zone.id}
                points={points}
                fill={hue}
                fillOpacity={selectedHere ? SHADE_SELECTED : alpha}
                stroke={hue}
                strokeOpacity={selectedHere ? 1 : 0.7}
                strokeWidth={selectedHere ? 2.5 : 1.25}
                strokeLinejoin="round"
                /* Decoration: the button layer above is what an operator, a
                   keyboard and a screen reader all reach. */
                pointerEvents="none"
              />
            )
          })}

          {/* The point each chip belongs to, and a leader to the ones that had
              to move. Without it a nudged label silently claims the wrong
              district, which is worse than an overlap. */}
          {zones.map((zone) => {
            const placement = placements.get(zone.id)
            if (!placement) return null
            return (
              <g key={`anchor-${zone.id}`} pointerEvents="none">
                {placement.displaced && (
                  <line
                    x1={placement.anchorX}
                    y1={placement.anchorY}
                    x2={placement.labelX}
                    y2={placement.labelY}
                    stroke="var(--border-strong)"
                    strokeWidth={0.75}
                  />
                )}
                <circle
                  cx={placement.anchorX}
                  cy={placement.anchorY}
                  r={1.6}
                  fill={isHot(zone) ? 'var(--destructive)' : 'var(--chart-series)'}
                />
              </g>
            )
          })}
        </svg>

        {/* The reachable layer: one real button per zone, at its own point. */}
        <ul role="list" className="absolute inset-0 m-0 list-none p-0">
          {zones.map((zone) => {
            const placement = placements.get(zone.id)
            if (!placement) return null
            return (
              <li
                key={zone.id}
                className="absolute"
                /* Genuinely dynamic — a live marker position, which is the one
                   case `token-audit` grants an inline style. */
                style={{
                  insetInlineStart: `${(placement.labelX / VIEW_W) * 100}%`,
                  insetBlockStart: `${(placement.labelY / viewH) * 100}%`,
                }}
              >
                <ZoneMarker
                  zone={zone}
                  metric={metric}
                  selected={selectedZoneId === zone.id}
                  onSelect={onSelect}
                  language={language}
                  t={t}
                />
              </li>
            )
          })}
        </ul>
        {/* The zoom, shared with Live Dispatch — see `MapZoomControls` for why
            it is two real buttons rather than the wheel alone. */}
        <MapZoomControls
          zoomAt={zoomAt}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          zoomInLabel={t('zones.map.zoom.in')}
          zoomOutLabel={t('zones.map.zoom.out')}
          side={free}
        />

        {/* **A solid card at 12px, stacked above the zoom (T5.8).** It was 10px
            grey on a gradient, which on a light basemap left the licence and
            the ramp's two ends unreadable; a card carries its own ground. */}
        <figcaption
          className={cn(
            'absolute bottom-20 z-10 flex max-w-md flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-2',
            free === 'end' ? 'end-3' : 'start-3',
          )}
        >
          <ShadeLegend metric={metric} t={t} />
          {/* The tile licence. OSM asks for the credit to be shown; it is over
              the map rather than under it because the map is now the region.
              It is outside the `aria-hidden` basemap on purpose — a licence
              notice a screen reader cannot reach is not a licence notice. */}
          <BasemapAttribution />
          {/* **Inline, and X15 says so.** A zone we hold no boundary for is a
              DATA FACT about the picture, not an explanation of it, and X15's
              carve-out keeps a data fact where the operator cannot miss it. It
              renders only when there is one. */}
          {unmapped.length > 0 && (
            <span>
              {t('zones.map.unmapped', {
                zones: unmapped.map((zone) => zone.name).join(', '),
              })}
            </span>
          )}
        </figcaption>
      </div>
    </figure>
  )
}

/**
 * The marker. A `<button>`, never an SVG node with a click handler — R6 of the
 * team brief and §7.4 both, and it is what makes the focus ring possible.
 *
 * **R5a use #4 lives here**: a starved zone's dot is `bg-destructive`. It is a
 * map marker, which is one of the four places red is allowed, and it is the
 * only red in this file. The dot is redundant to the printed reading and to the
 * priority word in the accessible name, so §7.5 holds in greyscale.
 */
function ZoneMarker({
  zone,
  metric,
  selected,
  onSelect,
  language,
  t,
}: {
  zone: Zone
  metric: ZoneHeatMetric
  selected: boolean
  onSelect: (id: string) => void
  language: Language
  t: Translate
}) {
  const reading = readingFor(zone, metric, language, t)
  const hot = isHot(zone)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(zone.id)}
      className={cn(
        'flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap',
        /* A pill, not a tag: the reference draws these fully rounded and that
           is what separates a label ON the map from a control beside it. */
        'rounded-full border bg-card px-2.5 py-1 text-2xs shadow-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected ? 'border-ring text-foreground' : 'border-border text-muted-foreground',
        'hover:border-border-strong hover:text-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', hot ? 'bg-destructive' : 'bg-chart-series')}
      />
      <span className="font-medium text-foreground">{zone.name}</span>
      {/* The reading wears the district's own hue, which is what makes the
          chip readable at a glance without hunting for its polygon. §7.5 holds
          in greyscale: the number itself is the reading, and the priority word
          below is announced. */}
      <span
        className={cn(
          'font-medium tabular-nums',
          hot ? 'text-critical-foreground' : 'text-foreground',
        )}
      >
        <bdi>{reading}</bdi>
      </span>
      {/* The word behind the colour. Never rendered, always announced. */}
      <span className="sr-only">{t(`zones.priority.${zone.recruitmentPriority}`)}</span>
    </button>
  )
}

/**
 * The ramp, stated. Four steps of the same alpha ladder the polygons use, with
 * the two ends named — a sequential legend, not a categorical one, because the
 * shading encodes one measure rather than three classes.
 */
function ShadeLegend({ metric, t }: { metric: ZoneHeatMetric; t: Translate }) {
  const steps = [0, 1 / 3, 2 / 3, 1]
  return (
    <span className="flex items-center gap-2">
      <span>{t('zones.map.legend.low')}</span>
      <span aria-hidden="true" className="flex items-center gap-px">
        {steps.map((step) => (
          <span
            key={step}
            className="size-3 rounded-xs border border-border"
            /* Dynamic: the same computed ramp the polygons draw. */
            style={{
              backgroundColor: 'var(--chart-series)',
              opacity: SHADE_FLOOR + step * (SHADE_CEILING - SHADE_FLOOR),
            }}
          />
        ))}
      </span>
      <span>{t('zones.map.legend.high', { metric: t(`zones.map.metric.${metric}`) })}</span>
    </span>
  )
}

/* ─────────────────────────────── inspector ─────────────────────────────── */

/**
 * The selected zone, with the two actions §11.2 governs.
 *
 * With nothing selected this is **not** blank and **not** an em dash: it is one
 * grey sentence telling the operator how to fill it, which is R8's treatment
 * for an empty card that is empty because nothing has been chosen yet.
 */
function Inspector({
  zone,
  canWrite,
  onSteer,
  onQueueRecruitment,
  language,
  t,
}: {
  zone: Zone | null
  canWrite: boolean
  onSteer: (zone: Zone) => void
  onQueueRecruitment: (zone: Zone) => void
  language: Language
  t: Translate
}) {
  if (!zone) {
    return (
      <div className="flex flex-col gap-1.5 bg-muted/40 px-6 py-5">
        <h3 className="text-base font-medium text-foreground">
          {t('zones.map.inspector.heading')}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('zones.map.inspector.none')}
        </p>
      </div>
    )
  }

  const hot = isHot(zone)

  return (
    /* **Tinted, and it is the one tint on the panel.** The selection and the
       list are two different kinds of thing sharing one box: one is about the
       zone the operator is looking at, the other is how they change it. A rule
       alone said "next section"; the tint says "this half is the subject". It
       is `--ev-bg2`, the ground the nav already uses, so no value is
       introduced — and it is the only reason the block needs no heading.

       A plain block rather than a `Card`: the `aside` around it already carries
       the border, the radius and the one shadow, so a card here would draw a
       second box inside the first. */
    <div className="flex flex-col gap-2.5 bg-muted/40 px-5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-0.5">
            <h3 className="truncate text-base font-medium text-foreground">{zone.name}</h3>
            {/* **One hint, not three inline lines under the readings (X15).**
                They explain the two numbers rather than change what the
                operator does next, and stacked they cost the list its rows. */}
            <InfoHint t={t}>
              {hintLines([
                t('zones.demandSupply.detail', {
                  demand: formatCount(zone.demand, language),
                  supply: formatCount(zone.supply, language),
                }),
                zone.captainsNeeded > 0 &&
                  t('zones.map.captainsNeeded', {
                    count: formatCount(zone.captainsNeeded, language),
                  }),
              ])}
            </InfoHint>
          </span>
          <span className="text-xs text-muted-foreground">{zone.city}</span>
        </div>
        <StatusBadge tone={RECRUITMENT_PRIORITY_TONE[zone.recruitmentPriority]}>
          {t(`zones.priority.${zone.recruitmentPriority}`)}
        </StatusBadge>
      </div>

      {/* **The ratio and the SHORTFALL, which is the pair the reference sets
          and the pair the panel's two actions are about.** It used to be the
          ratio and the failure rate — two symptoms, and the second of them is
          already on the strip four inches above. The zone is starved *and this
          many captains would clear it* is the whole argument for the
          `Queue recruitment` button directly under it; a failure rate is not an
          argument for anything the panel can do. */}
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
        <Reading
          label={t('zones.col.demandSupply')}
          value={
            zone.demandSupplyRatio === null ? ABSENT : formatRatio(zone.demandSupplyRatio, language)
          }
          tone={hot ? 'critical' : undefined}
        />
        <Reading
          label={t('zones.tile.captainsNeeded')}
          value={formatCount(zone.captainsNeeded, language)}
        />
      </dl>

      {/* **One of the two is the primary, and it is the one the panel argues
          for.** They were both secondary, which is two equal white plates under
          a sentence that names a single next step (R3 / D-1). `Steer captains`
          moves supply that already exists; `Queue recruitment` is what the
          shortfall reading above asks for, so it takes the filled treatment the
          reference gives it. No icons — the reference sets these as two words
          each, and a glyph on a 176px button spends the width the label needs
          in Arabic. */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="xs"
          className="flex-1"
          disabled={!canWrite || zone.activeSteerOffer !== null}
          title={
            zone.activeSteerOffer !== null
              ? t('zones.steer.blocked.live')
              : canWrite
                ? undefined
                : t('zones.blocked.permission')
          }
          onClick={() => onSteer(zone)}
        >
          {t('zones.action.steer')}
        </Button>
        <Button
          size="xs"
          className="flex-1"
          disabled={!canWrite || zone.recruitmentQueuedAt !== null}
          title={
            zone.recruitmentQueuedAt !== null
              ? t('zones.recruit.blocked.queued')
              : canWrite
                ? undefined
                : t('zones.blocked.permission')
          }
          onClick={() => onQueueRecruitment(zone)}
        >
          {t('zones.action.recruit')}
        </Button>
      </div>
    </div>
  )
}

function Reading({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'critical'
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="truncate text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="m-0">
        <span
          className={cn(
            'text-lg font-medium tabular-nums',
            tone === 'critical' ? 'text-critical-foreground' : 'text-foreground',
          )}
        >
          <bdi>{value}</bdi>
        </span>
      </dd>
    </div>
  )
}

/* ──────────────────────────────── the list ─────────────────────────────── */

/**
 * The keyboard route to every zone on the canvas, under one eyebrow naming what
 * the rows are ordered by.
 *
 * **There is no search here any more.** The panel lists the zones one operator
 * team runs — six in the seed, and a city's worth is still a list you scan
 * rather than one you query — and a field above six rows spent the panel's most
 * valuable band on a control nobody needed. The rows are also not the only way
 * in: every district on the canvas beside this is its own button, and the table
 * below the map has the search, the filters and the pagination for the case
 * where the list really is long.
 */
function ZoneList({
  zones,
  metric,
  onMetric,
  peaks,
  selectedZoneId,
  onSelect,
  language,
  t,
}: {
  zones: readonly Zone[]
  metric: ZoneHeatMetric
  onMetric: (next: ZoneHeatMetric) => void
  peaks: ZonePeaks
  selectedZoneId: string | null
  onSelect: (id: string) => void
  language: Language
  t: Translate
}) {
  return (
    <div className="flex flex-col pb-0.5">
      {/* **The eyebrow names the list for a screen reader and takes no row of
          its own (T2.1).** The tabs under it already say what the rows are
          ordered by, which is the half a sighted reader needed. */}
      <span
        id="zones-map-list-heading"
        className="sr-only"
      >
        {t('zones.map.list.heading')}
      </span>

      {/* **The measure, under the label of the thing it measures.**
          `Tabs`' `line` variant is the product's own underlined tab, so this is
          not a second tab language invented for one screen — it is the same
          control the rest of the console uses, at the one place where switching
          it changes what both the list and the map beside it are about.

          `Tabs` without `TabsContent`: there is no panel to swap, because the
          panel is the map and the rows underneath, which never unmount. The
          primitive drops the dangling `aria-controls` when no content is
          registered, which is exactly this case. */}
      <Tabs
        value={metric}
        onValueChange={(next) => onMetric(next as ZoneHeatMetric)}
        className="gap-0 px-5 pt-1 pb-1"
      >
        <TabsList variant="line" className="h-auto w-full justify-start gap-4 p-0">
          {HEAT_METRICS.map((each) => (
            <TabsTrigger
              key={each}
              value={each}
              className="h-auto flex-none px-0 pb-1.5 text-xs capitalize"
            >
              {t(`zones.map.metric.${each}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ul
        role="list"
        aria-labelledby="zones-map-list-heading"
        className="m-0 flex list-none flex-col p-0"
      >
        {zones.map((zone) => (
          <li key={zone.id}>
            <ZoneListRow
              zone={zone}
              metric={metric}
              peaks={peaks}
              selected={selectedZoneId === zone.id}
              onSelect={onSelect}
              language={language}
              t={t}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One row: the district's dot, its name and reading on one line, the bar under
 * them, and the counts the reading came from under that.
 *
 * **Full-bleed with a marker on the inline-start edge, not a rounded plate.**
 * The rows sit inside a floating panel that is itself a rounded box; a second
 * radius per row drew six little cards inside one card, and the selected one
 * read as a separate object rather than as the row that is currently on the
 * map. The reference marks the selection with a 2px rule on the leading edge
 * and a tint — which is also what makes it survive a screenshot in greyscale.
 */
function ZoneListRow({
  zone,
  metric,
  peaks,
  selected,
  onSelect,
  language,
  t,
}: {
  zone: Zone
  metric: ZoneHeatMetric
  peaks: ZonePeaks
  selected: boolean
  onSelect: (id: string) => void
  language: Language
  t: Translate
}) {
  const share = barShare(zone, metric, peaks)
  const hot = isHot(zone)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(zone.id)}
      className={cn(
        'flex w-full items-center gap-3 border-s-2 px-5 py-1 text-start transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        /* The edge is the DISTRICT'S hue, not the ink colour: the marker
           beside it on the canvas, the dot at the row's head and this rule are
           then one object seen three times. A near-black bar down the panel's
           leading edge read as a scrollbar. */
        selected
          ? hot
            ? 'border-s-destructive bg-muted'
            : 'border-s-chart-series bg-muted'
          : 'border-s-transparent hover:bg-muted/60',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', hot ? 'bg-destructive' : 'bg-chart-series')}
      />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-foreground">{zone.name}</span>
          <span
            className={cn(
              'shrink-0 text-sm font-medium tabular-nums',
              hot ? 'text-critical-foreground' : 'text-foreground',
            )}
          >
            <bdi>{readingFor(zone, metric, language, t)}</bdi>
          </span>
        </span>

        {/* **The bar moved onto the operands' line (T2.1).** Three stacked
            lines made a row so tall the panel showed one zone; the bar is
            `aria-hidden` decoration of a number the row already prints. */}
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="block h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border"
          >
            <span
              className={cn('block h-full rounded-full', hot ? 'bg-destructive' : 'bg-chart-series')}
              /* Dynamic: a computed chart width. */
              style={{ inlineSize: `${Math.round(share * 100)}%` }}
            />
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('zones.demandSupply.detail', {
              demand: formatCount(zone.demand, language),
              supply: formatCount(zone.supply, language),
            })}
          </span>
        </span>
      </span>
    </button>
  )
}

/* ─────────────────────────────── skeleton ──────────────────────────────── */

/**
 * Shaped like the surface it replaces — a canvas block beside a stack of list
 * rows — never a centred spinner (AC-35). `Skeleton`'s pulse is the only motion
 * in this file and it dies under `prefers-reduced-motion`.
 */
function ZonesMapSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="flex flex-col gap-3 wide:flex-row">
        <Skeleton className="aspect-4/3 min-w-0 flex-1 rounded-xl" />
        <div className="flex w-full shrink-0 flex-col gap-2 wide:w-80">
          <Skeleton className="h-32 rounded-xl" />
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

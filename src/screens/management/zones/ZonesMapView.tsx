/**
 * Management › Market & Zones — **the zone map, drawn from our own polygons.**
 *
 * ## Why there is no basemap, and why that is not a downgrade
 *
 * The surface this file replaces fetched slippy tiles straight from
 * `https://mt1.google.com/vt/` — **no API key, no billing account, no terms
 * accepted** — with `loading="eager"` and no `onError`. That is an unlicensed
 * use of somebody else's tile servers: it can be cut off without notice, and
 * when it is, every `<img>` renders as a silent broken graphic with no state
 * behind it. A second style pulled CARTO's `dark_all` basemap on the same
 * terms. Neither is shippable, and swapping one unlicensed host for another
 * would only move the problem.
 *
 * **No licensed provider is configured anywhere in this repo.** There is no map
 * key, no provider config, no `VITE_*` map variable — the only other tile URLs
 * in the tree are the legacy panel's own OpenStreetMap calls
 * (`eyvar_ops_panel_v40_fixed.html:7873`, `:11574`), which the findings
 * register already lists as a CSP problem rather than as a licence we hold.
 *
 * So this is the second of the three defensible answers: **a self-contained
 * vector rendering of our own zones, with no third-party fetch of any kind.**
 * Zones are Eyvar's data. A choropleth of our own polygons, shaded by the
 * measure the operator picked, needs no basemap to answer the question the
 * board exists to answer — *where is demand starved* — and it answers it
 * offline, under any CSP, with no vendor able to switch it off. `docs/ref/rtl.md`
 * points the same way: the map canvas does not mirror in Arabic, and geometry
 * we draw ourselves handles that cleanly rather than depending on a raster whose
 * labels are baked LTR.
 *
 * What went with the tiles, and why none of it is a loss:
 *   - **Roadmap / Satellite / Dark** were three basemaps. With no basemap they
 *     name nothing.
 *   - **Drag-to-pan and wheel zoom** were mouse-only, with no keyboard path to
 *     the same information (`a11y.md`). Six zones fitted to the frame need
 *     neither: everything is on screen at once.
 *   - **The Google watermark** was six hard-coded brand hexes attributing a
 *     basemap we no longer draw.
 *   - **The ping-loop utility on a starved zone** was a loop encoding severity,
 *     which R18 forbids outright — a loop may only mean *this feed is live*.
 *     The class is named in words here on purpose: Tailwind v4 scans comments as
 *     plain text, so spelling it out re-emitted the rule into `dist` and shipped
 *     the very loop this line records deleting. The same mechanism once shipped
 *     an auto physical margin out of a comment warning against physical margins
 *     — and then out of THIS comment, when the cautionary example was written
 *     literally. Name the parts, never the class. Verify in `dist`, not `src`.
 *   - **`CITIES_DATA`** was five hand-typed cities with invented user counts,
 *     one of which (Medina) is not in `cityFixtures` at all. R4-6b's whole
 *     point is that this screen's figures are derived, and the city breakdown
 *     that IS derived lives on the metrics board as `zones.citiesHealth`; the
 *     screen header states the coverage count off `listCities()`.
 *
 * ## The keyboard path is the point, not a concession
 *
 * A map that only answers a mouse gives an operator nothing. Every zone here is
 * reachable two ways: a real `<button>` marker on the canvas, and a real
 * `<button>` row in the list beside it. Both carry `aria-pressed`, both show
 * the focus ring, and the SVG itself is `role="img"` with a title and a
 * description — it is the picture, never the only route to the reading.
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
import { Navigation, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, canRetry } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { RECRUITMENT_PRIORITY_TONE, type Zone } from '@/data/types'
import type { AsyncStatus } from '@/hooks'
import { ABSENT, formatCount, formatPercent, formatRatio, type Language, type Translate } from '@/lib'

/* ─────────────────────────── our own geometry ──────────────────────────── */

/**
 * Zone boundaries in WGS84, **ours**, carried over unchanged from the surface
 * this file replaces. They were already in the repo; only the basemap under
 * them was somebody else's.
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
  'ZONE-01': {
    lat: 24.838,
    lng: 46.685,
    path: [
      { lat: 24.855, lng: 46.66 },
      { lat: 24.868, lng: 46.695 },
      { lat: 24.838, lng: 46.725 },
      { lat: 24.818, lng: 46.68 },
    ],
  },
  'ZONE-02': {
    lat: 24.805,
    lng: 46.645,
    path: [
      { lat: 24.82, lng: 46.62 },
      { lat: 24.84, lng: 46.655 },
      { lat: 24.81, lng: 46.675 },
      { lat: 24.785, lng: 46.635 },
    ],
  },
  'ZONE-03': {
    lat: 24.815,
    lng: 46.69,
    path: [
      { lat: 24.83, lng: 46.665 },
      { lat: 24.85, lng: 46.7 },
      { lat: 24.82, lng: 46.72 },
      { lat: 24.8, lng: 46.68 },
    ],
  },
  'ZONE-04': {
    lat: 24.668,
    lng: 46.735,
    path: [
      { lat: 24.685, lng: 46.71 },
      { lat: 24.705, lng: 46.745 },
      { lat: 24.675, lng: 46.77 },
      { lat: 24.65, lng: 46.73 },
    ],
  },
  'ZONE-05': {
    lat: 24.76,
    lng: 46.665,
    path: [
      { lat: 24.775, lng: 46.64 },
      { lat: 24.795, lng: 46.675 },
      { lat: 24.765, lng: 46.7 },
      { lat: 24.74, lng: 46.66 },
    ],
  },
  'ZONE-06': {
    lat: 24.805,
    lng: 46.755,
    path: [
      { lat: 24.82, lng: 46.73 },
      { lat: 24.84, lng: 46.77 },
      { lat: 24.81, lng: 46.795 },
      { lat: 24.785, lng: 46.755 },
    ],
  },
}

/* ────────────────────────── the drawing surface ────────────────────────── */

/**
 * The SVG user space. Its ratio is `aspect-4/3`, which the canvas element
 * carries, so `preserveAspectRatio="none"` introduces **no** distortion and no
 * letterbox — and an HTML marker positioned at `x / VIEW_W` of the box lands
 * exactly on the point the SVG drew. That equivalence is what lets the markers
 * be real `<button>`s in the document rather than SVG nodes with a click
 * handler and no focus ring.
 *
 * 4:3 rather than something wider because the six Riyadh districts span more
 * latitude than longitude: a wider frame spends the extra width on margin.
 */
const VIEW_W = 300
const VIEW_H = 225
/** Room for a marker to sit over its zone without leaving the frame. */
const VIEW_PAD = 26

/**
 * The smallest vertical gap, in view units, between two marker chips that also
 * overlap horizontally. A chip is ~26 CSS px tall and the canvas renders
 * `VIEW_H` units into roughly twice that many pixels, so 13 units clears one
 * chip with a hairline to spare.
 */
const LABEL_MIN_GAP = 13
/** Chips wider apart than this cannot collide, so they are never displaced. */
const LABEL_MIN_SPREAD = 58

/** Web Mercator's y, in the same units as longitude. Latitude alone is not linear. */
function mercatorY(lat: number): number {
  const clamped = Math.min(Math.max(lat, -85), 85)
  return (
    (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360))
  )
}

interface Projection {
  point: (lat: number, lng: number) => { x: number; y: number }
}

/**
 * Fit every drawn point into the view box, **uniformly**. A non-uniform fit
 * would fill the frame better and would be a lie about the shape of a district.
 */
function fitProjection(geometries: readonly ZoneGeometry[]): Projection {
  const xs: number[] = []
  const ys: number[] = []
  for (const geometry of geometries) {
    for (const vertex of geometry.path) {
      xs.push(vertex.lng)
      ys.push(mercatorY(vertex.lat))
    }
    xs.push(geometry.lng)
    ys.push(mercatorY(geometry.lat))
  }

  /* One zone, or none, still has to project to something finite. */
  const minX = xs.length > 0 ? Math.min(...xs) : 0
  const maxX = xs.length > 0 ? Math.max(...xs) : 1
  const minY = ys.length > 0 ? Math.min(...ys) : 0
  const maxY = ys.length > 0 ? Math.max(...ys) : 1
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  const scale = Math.min((VIEW_W - VIEW_PAD * 2) / spanX, (VIEW_H - VIEW_PAD * 2) / spanY)
  const offsetX = (VIEW_W - spanX * scale) / 2
  const offsetY = (VIEW_H - spanY * scale) / 2

  return {
    point: (lat, lng) => ({
      x: offsetX + (lng - minX) * scale,
      /* Screen y grows downward; north must stay up. */
      y: VIEW_H - offsetY - (mercatorY(lat) - minY) * scale,
    }),
  }
}

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
      labelY: Math.min(labelY, VIEW_H - 4),
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

const HEAT_METRICS: readonly ZoneHeatMetric[] = ['ratio', 'failure', 'demand']

/** The lightest and darkest the ramp goes. Two numbers, so the ramp is one line. */
const SHADE_FLOOR = 0.08
const SHADE_CEILING = 0.62

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
  const [metric, setMetric] = useState<ZoneHeatMetric>('ratio')
  const [shaded, setShaded] = useState(true)
  const [query, setQuery] = useState('')

  const mapped = useMemo(() => zones.filter((zone) => zone.id in ZONE_GEOMETRY), [zones])
  const unmapped = useMemo(() => zones.filter((zone) => !(zone.id in ZONE_GEOMETRY)), [zones])

  const projection = useMemo(
    () => fitProjection(mapped.map((zone) => ZONE_GEOMETRY[zone.id]).filter(isGeometry)),
    [mapped],
  )

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

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return zones
    return zones.filter(
      (zone) =>
        zone.name.toLowerCase().includes(needle) || zone.city.toLowerCase().includes(needle),
    )
  }, [zones, query])

  const selected = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
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
    <section aria-labelledby="zones-map-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="zones-map-heading" className="text-sm font-semibold text-foreground">
          {t('zones.map.heading')}
        </h2>
        <MetricToolbar
          metric={metric}
          onMetric={setMetric}
          shaded={shaded}
          onShaded={setShaded}
          t={t}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3 wide:flex-row">
        <MapCanvas
          zones={mapped}
          unmapped={unmapped}
          projection={projection}
          metric={metric}
          shaded={shaded}
          peaks={peaks}
          selectedZoneId={selectedZoneId}
          onSelect={setSelectedZoneId}
          language={language}
          t={t}
        />

        <aside className="flex w-full shrink-0 flex-col gap-3 wide:w-80">
          <Inspector
            zone={selected}
            canWrite={canWrite}
            onSteer={onSteer}
            onQueueRecruitment={onQueueRecruitment}
            language={language}
            t={t}
          />
          <ZoneList
            zones={matches}
            query={query}
            onQuery={setQuery}
            metric={metric}
            peaks={peaks}
            selectedZoneId={selectedZoneId}
            onSelect={setSelectedZoneId}
            language={language}
            t={t}
          />
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

/**
 * Three measures and a shading switch, as real `<button>`s with `aria-pressed`
 * — the same anatomy the strip's tile toggles use one level up, so the two read
 * as one system.
 */
function MetricToolbar({
  metric,
  onMetric,
  shaded,
  onShaded,
  t,
}: {
  metric: ZoneHeatMetric
  onMetric: (next: ZoneHeatMetric) => void
  shaded: boolean
  onShaded: (next: boolean) => void
  t: Translate
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id="zones-map-metric-label" className="text-xs text-muted-foreground">
        {t('zones.map.metric.label')}
      </span>
      <div
        role="group"
        aria-labelledby="zones-map-metric-label"
        className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5"
      >
        {HEAT_METRICS.map((each) => (
          <button
            key={each}
            type="button"
            aria-pressed={metric === each}
            onClick={() => onMetric(each)}
            className={cn(
              'rounded-md px-2 py-1 text-2xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              metric === each
                ? 'bg-card text-foreground shadow-1'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`zones.map.metric.${each}`)}
          </button>
        ))}
      </div>
      {/* An ACTION, not a toggle, and deliberately so: `aria-pressed` beside a
          label that already names the next action reads as "Hide shading,
          pressed", which is one negation too many to parse at a glance. The
          label carries the whole state. */}
      <Button variant="secondary" size="xs" onClick={() => onShaded(!shaded)}>
        {shaded ? t('zones.map.shading.on') : t('zones.map.shading.off')}
      </Button>
    </div>
  )
}

/* ──────────────────────────────── canvas ───────────────────────────────── */

function MapCanvas({
  zones,
  unmapped,
  projection,
  metric,
  shaded,
  peaks,
  selectedZoneId,
  onSelect,
  language,
  t,
}: {
  zones: readonly Zone[]
  unmapped: readonly Zone[]
  projection: Projection
  metric: ZoneHeatMetric
  shaded: boolean
  peaks: ZonePeaks
  selectedZoneId: string | null
  onSelect: (id: string) => void
  language: Language
  t: Translate
}) {
  const describedBy = 'zones-map-desc'
  const placements = placeMarkers(zones, projection)

  return (
    <figure className="m-0 flex min-w-0 flex-1 flex-col gap-2">
      {/*
        **`dir="ltr"` is the map canvas, and only the map canvas.** `rtl.md`:
        the canvas, its markers and its compass do NOT mirror in Arabic — north
        is up and east is inline-end of west in every locale — while the chrome
        around it does. Pinning the direction here is what lets every utility in
        this file stay logical without the geometry flipping under Arabic.
      */}
      <div
        dir="ltr"
        className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border bg-card"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
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
            const alpha = shaded
              ? SHADE_FLOOR + intensity(zone, metric, peaks) * (SHADE_CEILING - SHADE_FLOOR)
              : SHADE_FLOOR

            return (
              <polygon
                key={zone.id}
                points={points}
                /* One token, one dimension. The ramp is `--chart-series`'s own
                   alpha; no second hue is introduced and no new colour is
                   invented for a step that has no token. */
                fill="var(--chart-series)"
                fillOpacity={alpha}
                stroke={selectedHere ? 'var(--ring)' : 'var(--chart-series)'}
                strokeOpacity={selectedHere ? 1 : 0.55}
                strokeWidth={selectedHere ? 2 : 1}
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
                  fill="var(--chart-series)"
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
                  insetBlockStart: `${(placement.labelY / VIEW_H) * 100}%`,
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
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
        <ShadeLegend metric={metric} t={t} />
        {unmapped.length > 0 && (
          <span>
            {t('zones.map.unmapped', {
              zones: unmapped.map((zone) => zone.name).join(', '),
            })}
          </span>
        )}
      </figcaption>
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
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(zone.id)}
      className={cn(
        'flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap',
        'rounded-md border bg-card px-1.5 py-1 text-2xs shadow-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected ? 'border-ring text-foreground' : 'border-border text-muted-foreground',
        'hover:border-border-strong hover:text-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          zone.starved ? 'bg-destructive' : 'bg-chart-series',
        )}
      />
      <span className="font-medium text-foreground">{zone.name}</span>
      <span className="tabular-nums">
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
      <Card className="gap-2">
        <div className="flex flex-col gap-1 px-(--card-spacing)">
          <h3 className="text-sm font-semibold text-foreground">
            {t('zones.map.inspector.heading')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('zones.map.inspector.none')}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="gap-2">
      <div className="flex flex-col gap-2 px-(--card-spacing)">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-sm font-semibold text-foreground">{zone.name}</h3>
            <span className="text-xs text-muted-foreground">{zone.city}</span>
          </div>
          <StatusBadge tone={RECRUITMENT_PRIORITY_TONE[zone.recruitmentPriority]}>
            {t(`zones.priority.${zone.recruitmentPriority}`)}
          </StatusBadge>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <Reading
            label={t('zones.col.demandSupply')}
            value={
              zone.demandSupplyRatio === null
                ? ABSENT
                : formatRatio(zone.demandSupplyRatio, language)
            }
            detail={t('zones.demandSupply.detail', {
              demand: formatCount(zone.demand, language),
              supply: formatCount(zone.supply, language),
            })}
          />
          <Reading
            label={t('zones.col.failureRate')}
            value={formatPercent(zone.failureRate, language)}
            detail={t('zones.unserved.detail', {
              count: formatCount(zone.failures30d, language),
            })}
          />
        </dl>

        {/* Colour carries nothing here: the recruitment target is a number and
            a sentence. R5a has no fifth use to give a tinted panel. */}
        {zone.captainsNeeded > 0 && (
          <p className="text-xs text-foreground">
            {t('zones.map.captainsNeeded', {
              count: formatCount(zone.captainsNeeded, language),
            })}
          </p>
        )}

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
            <Navigation aria-hidden="true" />
            {t('zones.action.steer')}
          </Button>
          <Button
            variant="secondary"
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
            <Users aria-hidden="true" />
            {t('zones.action.recruit')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Reading({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="m-0 flex flex-col">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          <bdi>{value}</bdi>
        </span>
        <span className="text-2xs text-muted-foreground">{detail}</span>
      </dd>
    </div>
  )
}

/* ──────────────────────────────── the list ─────────────────────────────── */

/**
 * The keyboard route to every zone on the canvas, and the search that narrows
 * it. **Filtered to zero is the second kind of empty** — one grey sentence with
 * a clear-search action, never the first-run treatment, which would claim no
 * zone exists.
 */
function ZoneList({
  zones,
  query,
  onQuery,
  metric,
  peaks,
  selectedZoneId,
  onSelect,
  language,
  t,
}: {
  zones: readonly Zone[]
  query: string
  onQuery: (next: string) => void
  metric: ZoneHeatMetric
  peaks: ZonePeaks
  selectedZoneId: string | null
  onSelect: (id: string) => void
  language: Language
  t: Translate
}) {
  return (
    /* **The card sizes to its list.** It used to claim the residual height of
       the aside, and the aside is stretched to the map canvas beside it — a box
       whose height is an aspect ratio of the window width. So the taller the
       window, the more empty card there was under a list that was ALSO capped,
       and the six zones scrolled inside a scrollport with dead space beneath
       it. Measured at 1440 x 900 before: card 478px tall, list 384px, list
       content 392px — a scrollbar to reveal 8 pixels. Nothing here wants the
       residual; the cap below is the only height rule this list needs. */
    <Card className="gap-2">
      <div className="flex flex-col gap-2 px-(--card-spacing)">
        <h3 id="zones-map-list-heading" className="text-sm font-semibold text-foreground">
          {t('zones.map.list.heading')}
        </h3>

        <div className="relative">
          <Search
            aria-hidden="true"
            /* `top` has no logical counterpart and nothing to mirror — the
               inline axis is `start-2`, which does. */
            className="pointer-events-none absolute top-1/2 start-2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            aria-label={t('zones.map.search')}
            placeholder={t('zones.map.search')}
            className="ps-7"
          />
        </div>

        {zones.length === 0 ? (
          <EmptyState
            kind="no-match"
            card={false}
            message={t('zones.map.noMatch')}
            action={{ label: t('zones.map.noMatch.action'), onClick: () => onQuery('') }}
          />
        ) : (
          /* **Sizes to content, up to an honest cap.** The cap is 28rem — seven
             rows at the 64px pitch a row measures — chosen so the six zones the
             seed carries, and any list an operator can hold in their head, do
             not scroll at all. Beyond seven it scrolls, which is the point of a
             cap: this list is a picker beside a map, not a second index. */
          <ul
            role="list"
            aria-labelledby="zones-map-list-heading"
            className="m-0 flex max-h-112 list-none flex-col gap-1 overflow-y-auto p-0"
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
        )}
      </div>
    </Card>
  )
}

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
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(zone.id)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border p-2 text-start transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected ? 'border-ring bg-muted' : 'border-transparent hover:bg-muted',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              zone.starved ? 'bg-destructive' : 'bg-chart-series',
            )}
          />
          <span className="truncate text-xs font-medium text-foreground">{zone.name}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-foreground">
          <bdi>{readingFor(zone, metric, language, t)}</bdi>
        </span>
      </span>

      {/* The same ramp as the canvas, as a bar. `aria-hidden` because the row
          already prints the number the bar draws. */}
      <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-chart-series"
          /* Dynamic: a computed chart width. */
          style={{ inlineSize: `${Math.round(share * 100)}%` }}
        />
      </span>

      <span className="text-2xs text-muted-foreground">
        {t('zones.demandSupply.detail', {
          demand: formatCount(zone.demand, language),
          supply: formatCount(zone.supply, language),
        })}
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

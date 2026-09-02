/**
 * **The zone map's basemap — real street tiles under our own polygons.**
 *
 * ## What this replaces, and what it deliberately does not
 *
 * `ZonesMapView`'s header records that the surface this file's sibling replaced
 * fetched slippy tiles straight from `mt1.google.com/vt/` — *"no API key, no
 * billing account, no terms accepted"* — and that the answer was to draw our
 * own polygons on no basemap at all. That was the right call at the time and
 * the reasoning still holds against the thing it refused.
 *
 * The owner then asked for the map back, and chose, from the options put to
 * them, **real tiles that keep the zones**. So this is the basemap, and the two
 * halves of the original objection are both answered rather than ignored:
 *
 *   1. **Licence.** OpenStreetMap's tiles are published for exactly this and
 *      the attribution below is the condition of use. It is not somebody else's
 *      infrastructure being taken without asking. Google's tiles are NOT
 *      available on those terms at any URL — the keyless `output=embed` iframe
 *      is the only licensed keyless Google surface, and nothing can be drawn on
 *      top of an iframe, which would have cost the zone shading that is the
 *      point of the screen. That trade was put to the owner explicitly.
 *   2. **Silent failure.** The old code had `loading="eager"` and no `onError`,
 *      so a cut-off rendered as broken-image glyphs with no state behind it.
 *      Every tile here reports its own failure, and when enough of them fail
 *      the basemap removes itself and the map is exactly the self-contained
 *      choropleth it is today. A degraded map here is a map with no streets,
 *      never a map with holes in it.
 *
 * ## Why the alignment is exact rather than approximate
 *
 * `fitProjection` was already **Web Mercator** — `mercatorY` and a uniform fit
 * — which is the projection slippy tiles are cut in. So the two agree by
 * construction and not by tuning: view space is linear in `lng` and in
 * `mercatorY(lat)`, world tile space is linear in the same two, and this file
 * only has to compose the two linear maps. Nothing here nudges a polygon to sit
 * on a road.
 *
 * ## Zoom is measured, not guessed
 *
 * The tile a browser wants is the one whose pixels are about the size of the
 * CSS pixels it will be drawn into. The container's width is measured and the
 * zoom that lands closest is chosen, so tiles are neither upscaled into mush
 * nor downloaded at four times the resolution anyone can see.
 *
 * Rules applied
 *   §7.5       the basemap carries no meaning: every zone still prints its own
 *              number and its priority word, and the choropleth still shades.
 *              Turning the tiles off loses context, never a reading.
 *   §11.3      no spinner and no skeleton. Tiles fade in as they land; a map
 *              that is still fetching its context is not a map in a loading
 *              state, it is a map with less context.
 *   a11y       `aria-hidden`, and it must be: the SVG above it is the labelled
 *              picture (`role="img"`), the markers are real buttons, and street
 *              tiles announce nothing a screen reader can use.
 *   R18        no loop, no pulse, no animation beyond a one-shot opacity fade
 *              as each tile arrives.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** One tile's edge, in the tile scheme's own pixels. The OSM standard. */
const TILE_PX = 256

/**
 * The zoom levels worth asking for. Riyadh's six districts span roughly 0.18°
 * of longitude — about 18km — so anything below 10 is a country and anything
 * above 15 is a street corner. Clamping keeps a resize from requesting a zoom
 * that would flood the tile server with hundreds of images.
 */
const MIN_ZOOM = 10
const MAX_ZOOM = 15

/**
 * How many tiles may fail before the basemap gives up and removes itself.
 *
 * One or two failures are a flaky connection and the map is still legible with
 * a gap; a third means the host is refusing us, and a map two-thirds drawn is
 * worse than the clean choropleth it would otherwise be. This is the state the
 * old implementation had no way to express.
 */
const FAILURE_BUDGET = 3

export interface BasemapProps {
  /** View-space width, matching the SVG's `viewBox`. */
  viewW: number
  viewH: number
  /**
   * The view-space projection's linear parameters, from `fitProjection`.
   * `x = offsetX + (lng - minX) * scale` and
   * `y = viewH - offsetY - (mercatorY(lat) - minY) * scale`.
   */
  projection: { minX: number; minY: number; scale: number; offsetX: number; offsetY: number }
}

export function Basemap({ viewW, viewH, projection }: BasemapProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [boxWidth, setBoxWidth] = useState(0)
  const [failures, setFailures] = useState(0)

  /* The rendered width decides the zoom. `ResizeObserver` rather than a resize
     listener so a layout change that is not a window resize — the rail
     collapsing, the page measure engaging above 1440 — is picked up too. */
  useEffect(() => {
    const node = boxRef.current
    if (node === null || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      /* Rounded to 32px, so a drag-resize does not re-tile on every frame. */
      setBoxWidth(Math.round(width / 32) * 32)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const tiles = useMemo(() => {
    if (boxWidth <= 0) return null
    const { minX, minY, scale, offsetX, offsetY } = projection

    /* The view box's own geographic bounds, by inverting the projection at its
       corners. NOT the data's bounds: the padding around the zones is part of
       what the operator sees, and a basemap that stopped at the outermost
       polygon would leave a border of blank ground. */
    const lngAt = (x: number) => (x - offsetX) / scale + minX
    const mercAt = (y: number) => (viewH - offsetY - y) / scale + minY
    const west = lngAt(0)
    const east = lngAt(viewW)
    const north = mercAt(0)
    const south = mercAt(viewH)

    /* World pixels per view unit at zoom z is `(scale * 360) / (256 * 2^z)`
       inverted — pick the z whose world span in pixels is closest to the CSS
       width the container will draw those pixels into. */
    const spanLng = east - west
    const idealWorldPx = boxWidth
    let zoom = MIN_ZOOM
    let best = Number.POSITIVE_INFINITY
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
      const worldPx = (spanLng / 360) * TILE_PX * 2 ** z
      const distance = Math.abs(worldPx - idealWorldPx)
      if (distance < best) {
        best = distance
        zoom = z
      }
    }

    const worldSize = TILE_PX * 2 ** zoom
    const worldX = (lng: number) => ((lng + 180) / 360) * worldSize
    const worldY = (merc: number) => ((180 - merc) / 360) * worldSize

    const x0 = worldX(west)
    const x1 = worldX(east)
    const y0 = worldY(north)
    const y1 = worldY(south)

    const first = { x: Math.floor(x0 / TILE_PX), y: Math.floor(y0 / TILE_PX) }
    const last = { x: Math.floor(x1 / TILE_PX), y: Math.floor(y1 / TILE_PX) }
    const maxIndex = 2 ** zoom - 1

    const out: Array<{ key: string; z: number; x: number; y: number; style: React.CSSProperties }> =
      []
    for (let ty = first.y; ty <= last.y; ty++) {
      for (let tx = first.x; tx <= last.x; tx++) {
        /* A tile index outside the world is not requested. At Riyadh it cannot
           happen; leaving it unguarded would mean a 404 per edge tile the day
           this file is pointed at somewhere near the antimeridian. */
        if (tx < 0 || ty < 0 || tx > maxIndex || ty > maxIndex) continue
        out.push({
          key: `${zoom}/${tx}/${ty}`,
          z: zoom,
          x: tx,
          y: ty,
          /* Percentages, so the tiles scale with the container exactly as the
             SVG's `preserveAspectRatio="none"` does and the two never drift
             apart at a width nobody tested. */
          style: {
            insetInlineStart: `${(((tx * TILE_PX - x0) / (x1 - x0)) * 100).toFixed(4)}%`,
            top: `${(((ty * TILE_PX - y0) / (y1 - y0)) * 100).toFixed(4)}%`,
            width: `${((TILE_PX / (x1 - x0)) * 100).toFixed(4)}%`,
            height: `${((TILE_PX / (y1 - y0)) * 100).toFixed(4)}%`,
          },
        })
      }
    }
    return out
  }, [boxWidth, projection, viewW, viewH])

  const givenUp = failures >= FAILURE_BUDGET

  return (
    <div
      ref={boxRef}
      /* `aria-hidden` — the SVG above is the labelled picture and the markers
         are real buttons. Street tiles announce nothing a reader can use. */
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        /* **The tiles are inverted in dark, and this is the one honest way to
           do it.** OSM publishes a light raster and no dark one; a bright map
           under a dark console is the single loudest thing on the screen. The
           hue rotation puts greens and blues back on the right side of the
           wheel after the inversion, and the brightness trim keeps the paper
           from becoming a light source. It applies to the basemap only — the
           polygons are drawn in the SVG above and keep their own tokens. */
        'dark:brightness-90 dark:invert dark:hue-rotate-180',
        givenUp && 'hidden',
      )}
    >
      {tiles?.map((tile) => (
        <img
          key={tile.key}
          src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
          alt=""
          /* Lazy, unlike the implementation this replaces: six districts fit one
             screen, so nothing here is below the fold, but a tile that is not
             yet needed must not block the ones that are. */
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailures((n) => n + 1)}
          className="absolute max-w-none opacity-0 transition-opacity duration-200"
          onLoad={(event) => {
            event.currentTarget.style.opacity = '1'
          }}
          style={tile.style}
        />
      ))}
    </div>
  )
}

/**
 * **The attribution, and it is a licence condition rather than a courtesy.**
 *
 * OpenStreetMap's tiles may be used on the terms that the credit is shown. It
 * is a real link because the terms ask for one, and it is rendered outside the
 * `aria-hidden` basemap so a screen reader reaches it — a licence notice nobody
 * can read is not a licence notice.
 *
 * It hides itself with the basemap: crediting tiles that failed to load would
 * be a claim about something not on screen.
 */
export function BasemapAttribution({ hidden }: { hidden?: boolean }) {
  if (hidden === true) return null
  return (
    <p className="text-2xs text-muted-foreground">
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        © OpenStreetMap
      </a>{' '}
      contributors
    </p>
  )
}

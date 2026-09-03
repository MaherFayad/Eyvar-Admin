/**
 * **The map's arithmetic, shared by every board that draws Riyadh.**
 *
 * This is `ZonesMapView`'s own projection, lifted out of it unchanged. It moved
 * because a second board now draws on the same city — Operations › Live
 * Dispatch — and the one thing two maps of the same place must not do is
 * disagree about where a place is. `Basemap` fetches slippy tiles by inverting
 * `Projection.params`, so a second copy of this file would be a second chance
 * for the streets and the shapes drawn on them to drift apart at some window
 * width nobody tested.
 *
 * Nothing here knows about zones, trips or captains. It takes points in
 * degrees, and returns view-space coordinates for a `viewBox` of
 * `VIEW_W x viewH`.
 *
 * Rules applied
 *   §9.1   no physical direction is decided here. `rtl` is passed IN, because
 *          the panel that reserves space is the thing that follows direction;
 *          the geography never mirrors (`rtl.md` — north is up and east is
 *          inline-end of west in every locale).
 */

/** A point on the ground, in degrees. */
export interface GeoPoint {
  lat: number
  lng: number
}

/**
 * The SVG user space's width. The height is measured from the box and passed in
 * per call, because a map region is whatever shape the console has left.
 *
 * A drawn point at `x` lands at `x / VIEW_W` of the box's inline measure, which
 * is what lets a marker be a real `<button>` in the document positioned in
 * percentages rather than an SVG node with a click handler and no focus ring.
 */
export const VIEW_W = 300

/** The fallback height — 4 : 3, the ratio the canvas takes on a phone. */
export const VIEW_H_BASE = 225

/** Breathing room between the outermost drawn point and the frame. */
export const VIEW_PAD = 26

/**
 * **The pan-and-zoom state, as one transform over the fitted projection.**
 *
 * `k` scales about the view origin and `tx` / `ty` translate in view units, so
 * a drawn point is `k * base + t`. Composing it INTO the projection's five
 * parameters rather than wrapping the canvas in a CSS transform is what keeps
 * the street tiles honest: `Basemap` inverts those five numbers to work out
 * which tiles cover the frame, so a zoom that changes `scale` makes it fetch
 * the next zoom level's tiles rather than upscaling the ones it has. A CSS
 * transform would have blown up a z-11 raster into mush.
 */
export interface MapView {
  k: number
  tx: number
  ty: number
}

export const VIEW_IDENTITY: MapView = { k: 1, tx: 0, ty: 0 }

/** How far in the map goes. Past twelve, our own shapes are bigger than the box. */
export const MAX_ZOOM = 12

/** One notch of the buttons, and the ceiling on one wheel event. */
export const ZOOM_STEP = 1.35

/**
 * Keep the frame covered. At `k = 1` both translations are pinned to zero,
 * which is the right behaviour rather than a limitation: fully zoomed out there
 * is nothing to pan to, and a map that drifts off its own fit has lost the
 * thing the fit was for.
 */
export function clampView(view: MapView, viewH: number): MapView {
  const k = Math.min(Math.max(view.k, 1), MAX_ZOOM)
  return {
    k,
    tx: Math.min(Math.max(view.tx, VIEW_W * (1 - k)), 0),
    ty: Math.min(Math.max(view.ty, viewH * (1 - k)), 0),
  }
}

/** Web Mercator's y, in the same units as longitude. Latitude alone is not linear. */
export function mercatorY(lat: number): number {
  const clamped = Math.min(Math.max(lat, -85), 85)
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360))
}

export interface Projection {
  point: (lat: number, lng: number) => { x: number; y: number }
  /**
   * The same linear map, as its parameters, for anything that has to agree
   * with it rather than call it.
   *
   * `Basemap` needs to INVERT this — it turns the view box's corners back into
   * a geographic window in order to work out which tiles cover it — and a
   * second copy of the arithmetic in that file is a second place for the map
   * and its basemap to disagree about where a district is. Handing over the
   * five numbers keeps one derivation.
   */
  params: { minX: number; minY: number; scale: number; offsetX: number; offsetY: number }
}

export interface FitOptions {
  /** The view space's height, measured from the box. */
  viewH: number
  /**
   * View units a floating panel covers, on each end of the canvas.
   *
   * Zones floats one panel and reserves one end. Live Dispatch floats two — the
   * feed and the layer stack — so the fit has to centre the city in the GAP
   * between them rather than in the box. The tiles still cover the whole box
   * either way: a reserve moves what is drawn, never what is paved.
   */
  reserveStart?: number
  reserveEnd?: number
  /** Which physical side each of those is — the panels follow the document. */
  rtl?: boolean
  /**
   * Breathing room between the outermost drawn point and the usable frame.
   *
   * Defaults to `VIEW_PAD`, which is sized for a zone marker sitting over its
   * own district. A board fitting into a narrow gap between two panels wants
   * less, because the pad is charged twice against a measure that is already
   * a third of the box.
   */
  pad?: number
  /** The pan-and-zoom transform to compose in. */
  view?: MapView
  /**
   * Bounds to fit instead of the points' own extent.
   *
   * Live Dispatch needs this and Zones does not: a board whose points MOVE
   * would re-fit its whole frame every time one of them did, so a captain
   * crossing the city would drag Riyadh under the operator's cursor. Fitting a
   * declared window keeps the ground still and lets the pins move on it.
   */
  bounds?: readonly GeoPoint[]
}

/**
 * Fit every drawn point into the view box, **uniformly**. A non-uniform fit
 * would fill the frame better and would be a lie about the shape of a district.
 */
export function fitProjection(points: readonly GeoPoint[], options: FitOptions): Projection {
  const {
    viewH,
    reserveStart = 0,
    reserveEnd = 0,
    rtl = false,
    view = VIEW_IDENTITY,
    pad = VIEW_PAD,
  } = options
  const source = options.bounds ?? points

  const xs: number[] = []
  const ys: number[] = []
  for (const point of source) {
    xs.push(point.lng)
    ys.push(mercatorY(point.lat))
  }

  /* One point, or none, still has to project to something finite. */
  const minX = xs.length > 0 ? Math.min(...xs) : 0
  const maxX = xs.length > 0 ? Math.max(...xs) : 1
  const minY = ys.length > 0 ? Math.min(...ys) : 0
  const maxY = ys.length > 0 ? Math.max(...ys) : 1
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  /* The strip of canvas no panel covers, and where it begins on the SCREEN.
     `reserveStart` is an inline-start reserve, so in Arabic it is the right-
     hand cover and `reserveEnd` is the left-hand one. */
  const usableW = Math.max(VIEW_W - reserveStart - reserveEnd, pad * 3)
  const leftCover = rtl ? reserveEnd : reserveStart
  const fitScale = Math.min((usableW - pad * 2) / spanX, (viewH - pad * 2) / spanY)
  const fitX = leftCover + (usableW - spanX * fitScale) / 2
  const fitY = (viewH - spanY * fitScale) / 2

  /* `k * base + t`, folded into the same five numbers everything downstream
     already agrees on — see `MapView`. The y form is inverted, so its offset
     absorbs the translation with the opposite sign. */
  const scale = fitScale * view.k
  const offsetX = fitX * view.k + view.tx
  const offsetY = viewH - (viewH - fitY) * view.k - view.ty

  return {
    point: (lat, lng) => ({
      x: offsetX + (lng - minX) * scale,
      /* Screen y grows downward; north must stay up. */
      y: viewH - offsetY - (mercatorY(lat) - minY) * scale,
    }),
    params: { minX, minY, scale, offsetX, offsetY },
  }
}

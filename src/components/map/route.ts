/**
 * **The arithmetic every two-endpoint map on Riyadh shares.**
 *
 * Three sheets now draw a journey between two place names — a ride request, a
 * trip, and a subscription's daily commute — and each one arrived at the same
 * three pieces of maths: a floor under how far the fit may zoom in, a frame
 * built around the pair, and the crow-flies distance between them. They were
 * copied twice before this file existed, which is exactly the sequence
 * `projection.ts` records for itself: *"the one thing two maps of the same
 * place must not do is disagree about where a place is."*
 *
 * What is deliberately NOT here is the chrome. Each surface draws different
 * MARKS — a request has two ends, a trip has two ends and a captain between
 * them, a commitment has two ends and a direction of travel — and a component
 * flexible enough to serve all three would take more configuration than the
 * three files it replaced. The numbers are shared; the picture is each one's
 * own.
 */

import type { GeoPoint } from './projection'

/**
 * The smallest window the fit will draw, in degrees of longitude and of
 * Mercator-y.
 *
 * About 2.2km at Riyadh's latitude. Two district anchors in adjacent
 * neighbourhoods sit ~0.01° apart, and fitting exactly that would put the two
 * marks at opposite edges of a frame in which no street is recognisable — the
 * operator would be looking at a junction, not at a city they know. The floor
 * keeps enough ground around the pair to place it.
 */
export const MIN_SPAN_DEG = 0.02

/** Mean Earth radius in kilometres — the straight-line figure's one constant. */
const EARTH_KM = 6371

/**
 * **Great-circle kilometres between two anchors, and read what that is not.**
 *
 * `places.ts` places a name at its district's centre, so this is the distance
 * between two hand-placed points and never the distance anybody drove. Every
 * caller labels it `straight line`, because a number called `Distance` sitting
 * beside a fare is one an operator will price against.
 */
export function straightLineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The window to fit: the journey's own extent, widened to `MIN_SPAN_DEG` about
 * its centre when the two ends are close together or there is only one of them.
 *
 * A declared frame rather than the points' raw extent, because `fitProjection`
 * would otherwise scale a 400-metre hop until the whole frame was one junction.
 * Live Dispatch fits a fixed city box for the opposite reason — its pins move,
 * and a board that re-frames itself drags Riyadh under the cursor. A sheet is
 * about one journey that does not move, so it fits the journey.
 */
export function routeFrame(points: readonly GeoPoint[]): readonly GeoPoint[] {
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

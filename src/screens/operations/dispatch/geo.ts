/**
 * **Live Dispatch's own two pieces of geography.**
 *
 * The gazetteer that used to live here — the ~30 place names the fixtures use,
 * and `locate` — is `components/map/places.ts` now, because the request sheet
 * draws the same names and a component may not import from a screen. What is
 * left is what only this board has an opinion about: the frame it fits, and the
 * placeholder position it draws a captain at.
 *
 * `places.ts`'s header carries the standing caveat both of these inherit: these
 * are hand-placed anchors, not survey data and not telemetry.
 */

import { locate, type GeoPoint } from '@/components/map'

/**
 * **The frame, declared rather than derived.**
 *
 * The fit takes these two corners, so the ground stays still while the pins on
 * it change. Deriving the frame from the pins would mean the whole city jumped
 * every time a request was dispatched — the one thing a monitor must not do.
 *
 * The box is the corridor the board's rows actually happen in: Al Narjis and
 * Riyadh Front at the top, Al Malaz and Al Badiah at the bottom, Riyadh Park in
 * the west and Qurtubah in the east. It is deliberately TIGHTER than the
 * gazetteer's own extent — fitting every entry would spend most of the strip
 * between the two panels on the empty desert around the airport, and draw the
 * city the size of a postage stamp. A pin outside it is simply off-frame, which
 * is the truth about a trip leaving town.
 */
export const MAP_BOUNDS: readonly GeoPoint[] = [
  { lat: 24.655, lng: 46.6 },
  { lat: 24.875, lng: 46.795 },
]

/**
 * A small, stable integer from a string.
 *
 * FNV-1a, because the requirement is that a captain does not jump every time
 * React re-renders — not that anybody cannot guess the offset. `Math.random`
 * here would have made the fleet twitch on every keystroke in the feed's
 * search box.
 */
function hash(seed: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

/**
 * How far a captain may be spread from their district's anchor, in degrees.
 *
 * About 1.2km of latitude — a district's own radius, roughly. Wider and a
 * captain registered in Al Malaz would be drawn in Al Rawdah; narrower and the
 * seventeen captains who share the filler fixture's district land on one pixel
 * and the fleet reads as a single dot.
 */
const CAPTAIN_SPREAD = 0.011

/**
 * **A captain's placeholder position — read the file header before using it.**
 *
 * Derived from the district in their registered address, offset by a hash of
 * their id. It is NOT where the captain is. It exists so the board has
 * something to draw until `GET /drivers` returns a live position, and the
 * legend calls these marks `online`, never `live`.
 */
export function captainPoint(driver: { id: string; address: string; city: string }): GeoPoint | null {
  const anchor = locate(driver.address) ?? locate(driver.city)
  if (anchor === null) return null
  const seed = hash(driver.id)
  /* Two independent decimals out of one hash — the low bits and the high bits.
     Centred on zero so the anchor stays the middle of the cluster. */
  const dx = ((seed & 0xffff) / 0xffff - 0.5) * 2
  const dy = (((seed >>> 16) & 0xffff) / 0xffff - 0.5) * 2
  return {
    lat: anchor.lat + dy * CAPTAIN_SPREAD,
    /* Longitude degrees are shorter than latitude degrees at 24.7°N, so the
       same offset in both would draw an ellipse. `1 / cos(lat)` puts it back. */
    lng: anchor.lng + (dx * CAPTAIN_SPREAD) / Math.cos((anchor.lat * Math.PI) / 180),
  }
}

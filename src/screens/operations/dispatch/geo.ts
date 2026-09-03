/**
 * **Where Live Dispatch's rows sit on Riyadh.**
 *
 * ## The gap this fills, stated plainly
 *
 * `Trip`, `RideRequest` and `Driver` carry **no coordinates**. A pickup is the
 * string `'Al Sahafa District'` and a captain has a `city` and an `address`;
 * nothing in the data model knows a latitude. A dispatch board is a map, so
 * something has to turn those names into points, and this file is that
 * something — the same job `ZONE_GEOMETRY` does for `ZonesMapView`, and the
 * same caveat applies: **these are hand-placed anchors, not survey data and not
 * telemetry.** They are accurate to the district, not to the street.
 *
 * What the real API must send instead, and why this is not it:
 *
 *   - a **captain's live position** is the one thing a dispatch board exists to
 *     show, and it cannot be derived from a registered address. `captainPoint`
 *     below places a captain in the district they are registered in, spread by
 *     a hash of their id so a district of eleven captains reads as eleven
 *     captains. That is a **placeholder for `GET /drivers` returning a
 *     position**, and it is named and documented rather than quietly plausible.
 *   - a **trip's driven route** is a polyline. We have two endpoint names, so
 *     the map draws the straight connector between them. The legend says
 *     `pickup` and `destination`, never "route", because a straight line
 *     between two districts is not the road anybody drove.
 *
 * Both are on the handover for `docs/07-api/`. Until they arrive, this file is
 * the honest version: every mark on the map is labelled as the thing it is.
 *
 * ## Why a gazetteer rather than a geocoder
 *
 * The fixtures use a closed set of ~30 place names. A lookup table over that
 * set is greppable, hand-correctable, and cannot fail at runtime; a geocoding
 * call would put a third-party network dependency behind a monitor screen. A
 * name that is not in the table returns `null` and is **not drawn**, and the
 * board says how many rows that was — a row missing from a picture and a row
 * missing from the data look identical once you stop saying which it is.
 */

import type { GeoPoint } from '@/components/map'

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
 * Every place name the trip, request and captain fixtures use.
 *
 * Districts carry the anchor `ZONE_GEOMETRY` already chose where the two
 * overlap, so a request picked up in Al Sahafa lands on the Al Sahafa polygon
 * the zones board draws. That agreement is deliberate: two boards showing the
 * same district in two places is worse than neither showing it.
 *
 * Keys are matched case-insensitively and with a trailing `District` or `Dist.`
 * trimmed, so `'Al Sahafa'`, `'Al Sahafa District'` and the address form
 * `'Al Sahafa District, Riyadh'` all resolve to one point. See `normalise`.
 */
const PLACES: Readonly<Record<string, GeoPoint>> = {
  /* ── districts ─────────────────────────────────────────────────────────
     The six that `ZONE_GEOMETRY` also anchors keep its exact numbers. */
  'al narjis': { lat: 24.8555, lng: 46.6575 },
  'al sahafa': { lat: 24.8175, lng: 46.6375 },
  kafd: { lat: 24.766, lng: 46.642 },
  'king abdullah financial district': { lat: 24.766, lng: 46.642 },
  'al malaz': { lat: 24.667, lng: 46.737 },
  qurtubah: { lat: 24.797, lng: 46.78 },
  'al yasmin': { lat: 24.8215, lng: 46.69 },

  /* The rest of the districts the fixtures name, placed from the city's own
     layout: north-west along King Fahd Road, then the older grid to the south. */
  'al aqiq': { lat: 24.7745, lng: 46.628 },
  'al badiah': { lat: 24.625, lng: 46.664 },
  'al malqa': { lat: 24.808, lng: 46.611 },
  'al nuzha': { lat: 24.757, lng: 46.718 },
  'al rabwah': { lat: 24.716, lng: 46.748 },
  'al rawdah': { lat: 24.736, lng: 46.769 },
  'al shifa': { lat: 24.57, lng: 46.729 },
  'al suwaidi': { lat: 24.586, lng: 46.672 },
  'al wurud': { lat: 24.7075, lng: 46.672 },
  hittin: { lat: 24.766, lng: 46.586 },
  'king fahd': { lat: 24.748, lng: 46.674 },
  olaya: { lat: 24.696, lng: 46.6845 },
  'al olaya': { lat: 24.696, lng: 46.6845 },

  /* ── landmarks the fixtures use as destinations ────────────────────── */
  'airport t5': { lat: 24.9578, lng: 46.6989 },
  diriyah: { lat: 24.737, lng: 46.575 },
  'al fanar mall': { lat: 24.8032, lng: 46.7261 },
  'granada mall': { lat: 24.762, lng: 46.742 },
  'king abdullah rd': { lat: 24.759, lng: 46.696 },
  'king fahd rd': { lat: 24.748, lng: 46.674 },
  'king fahd st': { lat: 24.748, lng: 46.674 },
  'king saud university': { lat: 24.7223, lng: 46.6197 },
  'kingdom tower': { lat: 24.7115, lng: 46.6745 },
  'olaya towers': { lat: 24.6935, lng: 46.6855 },
  'princess noura university': { lat: 24.8478, lng: 46.71 },
  'riyadh front': { lat: 24.836, lng: 46.716 },
  'riyadh park': { lat: 24.7726, lng: 46.6157 },
  'riyadh park mall': { lat: 24.7726, lng: 46.6157 },

  /* ── the Arabic forms the fixtures also carry ──────────────────────────
     `denormalisation.test.ts` keeps both languages in the fixtures on purpose;
     a table that only answered the English ones would drop a row from the map
     the moment somebody switched the console to Arabic. */
  'حي الملقا': { lat: 24.808, lng: 46.611 },
  'حي حطين': { lat: 24.766, lng: 46.586 },
  'مستشفى الملك فيصل التخصصي': { lat: 24.689, lng: 46.689 },
  'مطار الملك خالد الدولي، صالة ٥': { lat: 24.9578, lng: 46.6989 },
}

/**
 * One name, in the form `PLACES` is keyed by.
 *
 * The three shapes the fixtures use for one place are `'Al Sahafa'`,
 * `'Al Sahafa District'` and `'Al Sahafa District, Riyadh'`. Trimming the city
 * clause and the word `District` collapses them, so the table holds one entry
 * per place rather than three that can drift apart.
 */
function normalise(name: string): string {
  const withoutCity = name.split(',')[0] ?? name
  return withoutCity
    .trim()
    .toLowerCase()
    .replace(/\s+(district|dist\.?)$/u, '')
    .replace(/\s+/gu, ' ')
}

/** The point for a place name, or `null` when the gazetteer has no entry. */
export function locate(name: string | null | undefined): GeoPoint | null {
  if (name === null || name === undefined || name === '') return null
  return PLACES[normalise(name)] ?? null
}

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
